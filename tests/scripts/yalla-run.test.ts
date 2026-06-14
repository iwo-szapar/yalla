import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mkdtempSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { runYallaRun } from '../../scripts/yalla-run.js'

function tempRoot() {
  return mkdtempSync(join(tmpdir(), 'yalla-run-'))
}

function writeConfig(root: string, extra = '') {
  mkdirSync(join(root, '.claude'), { recursive: true })
  mkdirSync(join(root, 'tests'))
  writeFileSync(
    join(root, '.claude/YALLA.md'),
    `repo: "owner/repo"
base_branch: main
tracking_mode: github
test_dir: tests/
commands:
  test: "npm test"
  typecheck: "npm run typecheck"
models:
  classify: "cheap"
  implement: "sonnet"
  review: "opus"
${extra}`
  )
}

describe('scripts/yalla-run.ts', () => {
  it('appends structured events to .pipeline/events.jsonl', async () => {
    const root = tempRoot()
    writeConfig(root)
    const result = await runYallaRun({ command: 'event', rootDir: root, event: 'stage.started', phase: 'plan', message: 'Planning started', now: () => '2026-06-14T10:00:00.000Z' })

    expect(result.exitCode).toBe(0)
    expect(result.eventPath).toBe(join(root, '.pipeline/events.jsonl'))
    const lines = readFileSync(result.eventPath ?? '', 'utf8').trim().split('\n')
    expect(lines).toHaveLength(1)
    expect(JSON.parse(lines[0])).toMatchObject({ ts: '2026-06-14T10:00:00.000Z', event: 'stage.started', phase: 'plan', properties: { message: 'Planning started' } })
  })

  it('writes phase checkpoints and exposes status', async () => {
    const root = tempRoot()
    writeConfig(root)
    const checkpoint = await runYallaRun({ command: 'checkpoint', rootDir: root, phase: 'test', message: 'Tests passed', now: () => '2026-06-14T10:00:00.000Z' })
    const status = await runYallaRun({ command: 'status', rootDir: root })

    expect(checkpoint.exitCode).toBe(0)
    expect(existsSync(checkpoint.checkpointPath ?? '')).toBe(true)
    expect(status.status).toMatchObject({ phase: 'test', verdict: 'UNKNOWN', next_action: 'Continue to review.' })
    expect(status.status?.completed_phases).toEqual(['classify', 'track', 'plan', 'work', 'test'])
  })

  it('generates a local HTML run report', async () => {
    const root = tempRoot()
    writeConfig(root)
    await runYallaRun({ command: 'event', rootDir: root, event: 'review.completed', phase: 'review', message: 'Review passed' })
    const result = await runYallaRun({ command: 'report', rootDir: root })

    expect(result.reportPath).toBe(join(root, '.pipeline/report.html'))
    const html = readFileSync(result.reportPath ?? '', 'utf8')
    expect(html).toContain('Yalla Run Report')
    expect(html).toContain('Pipeline Graph')
    expect(html).toContain('review.completed')
    expect(html).toContain('Review passed')
  })

  it('exports a portable run bundle with status telemetry', async () => {
    const root = tempRoot()
    writeConfig(root)
    await runYallaRun({ command: 'event', rootDir: root, event: 'stage.started', phase: 'plan', message: 'start', now: () => '2026-06-14T10:00:00.000Z' })
    await runYallaRun({ command: 'event', rootDir: root, event: 'stage.completed', phase: 'plan', message: 'done', now: () => '2026-06-14T10:01:05.000Z' })
    const result = await runYallaRun({ command: 'export', rootDir: root })

    expect(result.exitCode).toBe(0)
    expect(existsSync(join(result.exportPath ?? '', 'events.jsonl'))).toBe(true)
    expect(result.status?.exported_artifacts).toEqual(expect.arrayContaining(['events.jsonl', 'status.json']))
    const status = JSON.parse(readFileSync(join(result.exportPath ?? '', 'status.json'), 'utf8'))
    expect(status.telemetry.duration_seconds).toBe(65)
    expect(status.telemetry.phase_event_counts.plan).toBe(2)
  })

  it('doctor validates repo, config, commands, model routes, and gh', async () => {
    const root = tempRoot()
    writeConfig(root)
    const result = await runYallaRun({
      command: 'doctor',
      rootDir: root,
      commandRunner: async (command) => {
        if (command === 'git') return { stdout: 'true', stderr: '', exitCode: 0 }
        return { stdout: 'logged in', stderr: '', exitCode: 0 }
      },
    })

    expect(result.exitCode).toBe(0)
    expect(result.checks).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'model_routing', status: 'pass' }), expect.objectContaining({ name: 'github_auth', status: 'pass' })]))
  })

  it('doctor fails unknown model route keys', async () => {
    const root = tempRoot()
    writeConfig(root, '  expensive: "opus"\n')
    const result = await runYallaRun({
      command: 'doctor',
      rootDir: root,
      commandRunner: async () => ({ stdout: '', stderr: '', exitCode: 0 }),
    })

    expect(result.exitCode).toBe(1)
    expect(result.checks).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'model_routing', status: 'fail', detail: expect.stringContaining('expensive') })]))
  })

  it('resume and rewind return non-destructive instructions', async () => {
    const root = tempRoot()
    writeConfig(root)
    await runYallaRun({ command: 'checkpoint', rootDir: root, phase: 'plan' })
    await runYallaRun({ command: 'checkpoint', rootDir: root, phase: 'work' })

    const resume = await runYallaRun({ command: 'resume', rootDir: root })
    const rewind = await runYallaRun({ command: 'rewind', rootDir: root, target: 'plan' })

    expect(resume.exitCode).toBe(0)
    expect(resume.instruction).toContain('Resume from')
    expect(rewind.exitCode).toBe(0)
    expect(rewind.instruction).toContain('does not run destructive git commands')
    expect(rewind.checkpointPath).toContain('plan')
  })
})
