import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isMutatingCommand, runYallaAutopilot, type CommandRunner } from '../../scripts/yalla-autopilot.js'

function tempRoot() {
  return mkdtempSync(join(tmpdir(), 'yalla-autopilot-'))
}

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
}

describe('scripts/yalla-autopilot.ts', () => {
  it('runs a bounded dry-run and writes state plus telemetry artifacts', async () => {
    const calls: string[] = []
    const runner: CommandRunner = async (command, args) => {
      calls.push([command, ...args].join(' '))
      if (calls.length === 1) return { stdout: 'logged in', stderr: '', exitCode: 0 }
      return {
        stdout: JSON.stringify({ number: 1180, title: 'PRD 05', url: 'https://github.com/example/repo/issues/1180' }),
        stderr: '',
        exitCode: 0,
      }
    }

    const result = await runYallaAutopilot({
      issue: 'issue-1180',
      mode: 'dry-run',
      rootDir: tempRoot(),
      repo: 'example-owner/example-repo',
      commandRunner: runner,
      now: () => '2026-06-09T18:00:00.000Z',
    })

    expect(result.status).toBe('dry-run-complete')
    expect(result.exitCode).toBe(0)
    expect(calls).toEqual([
      'gh auth status',
      'gh issue view 1180 --repo example-owner/example-repo --json number,title,url,state,labels',
    ])
    expect(readJson(result.statePath)).toMatchObject({
      issue_id: 'issue-1180',
      mode: 'dry-run',
      status: 'dry-run-complete',
      stop_reason: 'dry-run-no-mutations',
      dry_run_side_effects_blocked: true,
    })
    expect(readJson(result.telemetryPath)).toMatchObject({
      issue_id: 'issue-1180',
      iterations_budget: 1,
      iterations_used: 1,
      side_effects_attempted: [],
    })
  })

  it('stops before issue work when GitHub auth is missing', async () => {
    const calls: string[] = []
    const runner: CommandRunner = async (command, args) => {
      calls.push([command, ...args].join(' '))
      return { stdout: '', stderr: 'not logged in', exitCode: 1 }
    }

    const result = await runYallaAutopilot({
      issue: 'issue-1180',
      mode: 'dry-run',
      rootDir: tempRoot(),
      commandRunner: runner,
      now: () => '2026-06-09T18:00:00.000Z',
    })

    expect(result.status).toBe('blocked')
    expect(result.exitCode).toBe(1)
    expect(calls).toEqual(['gh auth status'])
    expect(readJson(result.statePath)).toMatchObject({
      status: 'blocked',
      github_auth: 'fail',
      stop_reason: 'missing-github-auth',
    })
    expect(readJson(result.telemetryPath)).toMatchObject({ iterations_used: 0 })
  })

  it('rejects non-canonical issue ids before running commands', async () => {
    const calls: string[] = []
    await expect(
      runYallaAutopilot({
        issue: '1180',
        mode: 'dry-run',
        rootDir: tempRoot(),
        commandRunner: async (command, args) => {
          calls.push([command, ...args].join(' '))
          return { stdout: '', stderr: '', exitCode: 0 }
        },
      })
    ).rejects.toThrow('Issue must use canonical issue-### format.')

    expect(calls).toEqual([])
  })

  it('rejects execute mode because PRD 05 is dry-run only', async () => {
    await expect(
      runYallaAutopilot({
        issue: 'issue-1180',
        mode: 'execute' as 'dry-run',
        rootDir: tempRoot(),
      })
    ).rejects.toThrow('Mode must be dry-run')
  })

  it('records a blocked state when the issue probe fails', async () => {
    const result = await runYallaAutopilot({
      issue: 'issue-1180',
      mode: 'dry-run',
      rootDir: tempRoot(),
      commandRunner: async (_command, args) => {
        if (args[0] === 'auth') return { stdout: 'logged in', stderr: '', exitCode: 0 }
        return { stdout: '', stderr: 'not found', exitCode: 1 }
      },
      now: () => '2026-06-09T18:00:00.000Z',
    })

    expect(result.status).toBe('blocked')
    expect(result.exitCode).toBe(1)
    expect(readJson(result.statePath)).toMatchObject({
      github_auth: 'pass',
      stop_reason: 'issue-probe-failed',
    })
  })

  it('redacts token-shaped command output before writing telemetry', async () => {
    const githubToken = ['gho', 'realLookingTokenValue1234567890'].join('_')
    const sbkToken = ['sbk', '1234', 'realLookingCustomerTokenValue1234567890'].join('_')
    const result = await runYallaAutopilot({
      issue: 'issue-1180',
      mode: 'dry-run',
      rootDir: tempRoot(),
      commandRunner: async (_command, args) => {
        if (args[0] === 'auth') return { stdout: `Token: ${githubToken}`, stderr: '', exitCode: 0 }
        return {
          stdout: JSON.stringify({ url: 'https://github.com/example/repo/issues/1180' }),
          stderr: sbkToken,
          exitCode: 0,
        }
      },
    })
    const telemetry = JSON.stringify(readJson(result.telemetryPath))

    expect(telemetry).toContain('<redacted-token>')
    expect(telemetry).toContain('<redacted-sbk-token>')
    expect(telemetry).not.toContain(githubToken)
    expect(telemetry).not.toContain(sbkToken)
  })

  it('classifies issue, PR, and git mutations as dry-run blocked commands', () => {
    expect(isMutatingCommand('gh', ['issue', 'edit', '1180'])).toBe('gh issue edit')
    expect(isMutatingCommand('gh', ['pr', 'create'])).toBe('gh pr create')
    expect(isMutatingCommand('gh', ['pr', 'merge', '1180'])).toBe('gh pr merge')
    expect(isMutatingCommand('git', ['push', 'origin', 'branch'])).toBe('git push')
    expect(isMutatingCommand('gh', ['issue', 'view', '1180'])).toBeUndefined()
  })

  it('keeps opencode permissions conservative', () => {
    const config = readJson(new URL('../../opencode.json', import.meta.url).pathname)
    const permissions = config.permission as Record<string, unknown>
    const bash = permissions.bash as Record<string, unknown>

    expect(permissions.doom_loop).toBe('ask')
    expect(permissions.task).toBe('ask')
    expect(bash['git commit*']).toBe('ask')
    expect(bash['git push*']).toBe('ask')
    expect(bash['gh pr create*']).toBe('ask')
    expect(bash['gh issue create*']).toBe('ask')
    expect(bash['rm *']).toBe('deny')
    expect(bash['sudo *']).toBe('deny')
  })
})
