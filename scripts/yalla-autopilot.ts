#!/usr/bin/env tsx

import { execFile, execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

// Genericized repo target.
//
// Resolution order (CLI entrypoint only):
//   1. `YALLA_REPO` environment variable, if set (e.g. "owner/repo").
//   2. `gh repo view --json nameWithOwner -q .nameWithOwner` against the cwd repo.
//   3. The documented placeholder below.
//
// The exported `runYallaAutopilot()` defaults to DEFAULT_REPO when no `repo`
// option is passed so callers (and tests) get deterministic behavior; the
// dynamic env/gh detection happens in `resolveRepo()` which `main()` calls.
// This is an inert placeholder — real runs pass an explicit `repo`, set
// YALLA_REPO, or rely on `gh repo view` auto-detection. It is intentionally
// not a real repository so a misconfigured run targets nothing.
const DEFAULT_REPO = 'OWNER/REPO'

const MUTATING_COMMANDS = [
  'gh issue edit',
  'gh issue create',
  'gh issue comment',
  'gh pr create',
  'gh pr merge',
  'gh pr edit',
  'git commit',
  'git push',
]

type Mode = 'dry-run'
type Status = 'blocked' | 'dry-run-complete'

export type CommandResult = {
  stdout: string
  stderr: string
  exitCode: number
}

export type CommandRunner = (command: string, args: string[]) => Promise<CommandResult>

export type AutopilotOptions = {
  issue: string
  mode: Mode
  repo?: string
  rootDir?: string
  commandRunner?: CommandRunner
  now?: () => string
}

export type AutopilotRunResult = {
  status: Status
  exitCode: number
  statePath: string
  telemetryPath: string
}

type CommandRecord = CommandResult & {
  command: string
  args: string[]
}

type AutopilotState = {
  issue_id: string
  mode: Mode
  phase: 'preflight' | 'issue-probe' | 'stopped'
  status: Status
  github_auth: 'pass' | 'fail'
  started_at: string
  completed_at: string
  stop_reason: string
  dry_run_side_effects_blocked: boolean
  issue_url?: string
}

type LoopTelemetry = {
  issue_id: string
  mode: Mode
  iterations_budget: number
  iterations_used: number
  started_at: string
  completed_at: string
  command_results: CommandRecord[]
  side_effects_attempted: string[]
}

/**
 * Resolve the target repo for the CLI entrypoint.
 * Used only by `main()`; the exported runner keeps the deterministic default.
 */
export function resolveRepo(): string {
  const fromEnv = process.env.YALLA_REPO?.trim()
  if (fromEnv) return fromEnv

  try {
    const detected = execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'], {
      encoding: 'utf8',
    }).trim()
    if (detected) return detected
  } catch {
    // gh unavailable or not inside a GitHub repo — fall back to the placeholder.
  }

  return DEFAULT_REPO
}

function parseArgs(argv: string[]): AutopilotOptions {
  if (argv[0] !== 'run') {
    throw new Error('Usage: tsx scripts/yalla-autopilot.ts run --issue issue-### --mode dry-run')
  }

  let issue = ''
  let mode: Mode = 'dry-run'
  let repo: string | undefined
  for (let index = 1; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === '--issue') issue = argv[++index] ?? ''
    else if (arg === '--mode') mode = parseMode(argv[++index] ?? '')
    else if (arg === '--repo') repo = argv[++index] ?? ''
    else throw new Error(`Unknown arg: ${arg}`)
  }

  return { issue, mode, repo }
}

function parseMode(value: string): Mode {
  if (value === 'dry-run') return value
  throw new Error('Mode must be dry-run. Execute mode is out of scope for PRD 05.')
}

function issueNumber(issue: string): string {
  const match = issue.match(/^issue-(\d+)$/)
  if (!match) throw new Error('Issue must use canonical issue-### format.')
  return match[1]
}

async function defaultCommandRunner(command: string, args: string[]): Promise<CommandResult> {
  try {
    const result = await execFileAsync(command, args, { encoding: 'utf8' })
    return { stdout: result.stdout, stderr: result.stderr, exitCode: 0 }
  } catch (error) {
    const failed = error as { stdout?: string; stderr?: string; code?: number }
    return { stdout: failed.stdout ?? '', stderr: failed.stderr ?? '', exitCode: Number(failed.code ?? 1) }
  }
}

function redactCommandResult(result: CommandResult): CommandResult {
  return {
    stdout: redactSecrets(result.stdout),
    stderr: redactSecrets(result.stderr),
    exitCode: result.exitCode,
  }
}

function redactSecrets(value: string) {
  return value
    .replace(/gh[opsu]_[A-Za-z0-9_]+/g, '<redacted-token>')
    .replace(/sbk_[A-Za-z0-9_]+/g, '<redacted-sbk-token>')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '<redacted-jwt>')
}

export function isMutatingCommand(command: string, args: string[]) {
  const fullCommand = [command, ...args].join(' ')
  return MUTATING_COMMANDS.find(prefix => fullCommand.startsWith(prefix))
}

function assertDryRunSafe(command: string, args: string[]) {
  const mutatingCommand = isMutatingCommand(command, args)
  if (mutatingCommand) {
    throw new Error(`Dry-run blocked mutating command: ${mutatingCommand}`)
  }
}

function writeJson(rootDir: string, name: string, value: unknown) {
  const pipelineDir = resolve(rootDir, '.pipeline')
  mkdirSync(pipelineDir, { recursive: true })
  const path = resolve(pipelineDir, name)
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
  return path
}

export async function runYallaAutopilot(options: AutopilotOptions): Promise<AutopilotRunResult> {
  const issue = options.issue
  const number = issueNumber(issue)
  const mode = parseMode(options.mode)
  const repo = options.repo ?? DEFAULT_REPO
  const rootDir = options.rootDir ?? process.cwd()
  const now = options.now ?? (() => new Date().toISOString())
  const startedAt = now()
  const commandRunner = options.commandRunner ?? defaultCommandRunner
  const commandResults: CommandRecord[] = []
  const sideEffectsAttempted: string[] = []

  function finish(status: Status, githubAuth: AutopilotState['github_auth'], stopReason: string, iterationsUsed: number, issueUrl?: string) {
    return finishRun({
      issue,
      mode,
      rootDir,
      startedAt,
      completedAt: now(),
      status,
      phase: 'stopped',
      githubAuth,
      stopReason,
      commandResults,
      sideEffectsAttempted,
      iterationsUsed,
      issueUrl,
    })
  }

  async function run(command: string, args: string[]) {
    if (mode === 'dry-run') assertDryRunSafe(command, args)
    const result = redactCommandResult(await commandRunner(command, args))
    commandResults.push({ command, args, ...result })
    return result
  }

  const auth = await run('gh', ['auth', 'status'])
  if (auth.exitCode !== 0) {
    return finish('blocked', 'fail', 'missing-github-auth', 0)
  }

  const issueView = await run('gh', ['issue', 'view', number, '--repo', repo, '--json', 'number,title,url,state,labels'])
  if (issueView.exitCode !== 0) {
    return finish('blocked', 'pass', 'issue-probe-failed', 0)
  }

  const issueUrl = parseIssueUrl(issueView.stdout)
  return finish('dry-run-complete', 'pass', 'dry-run-no-mutations', 1, issueUrl)
}

function parseIssueUrl(stdout: string) {
  if (!stdout.trim()) return undefined
  try {
    const parsed = JSON.parse(stdout) as { url?: string }
    return parsed.url
  } catch {
    return undefined
  }
}

function finishRun(input: {
  issue: string
  mode: Mode
  rootDir: string
  startedAt: string
  completedAt: string
  status: Status
  phase: AutopilotState['phase']
  githubAuth: AutopilotState['github_auth']
  stopReason: string
  commandResults: CommandRecord[]
  sideEffectsAttempted: string[]
  iterationsUsed: number
  issueUrl?: string
}): AutopilotRunResult {
  const state: AutopilotState = {
    issue_id: input.issue,
    mode: input.mode,
    phase: input.phase,
    status: input.status,
    github_auth: input.githubAuth,
    started_at: input.startedAt,
    completed_at: input.completedAt,
    stop_reason: input.stopReason,
    dry_run_side_effects_blocked: input.mode === 'dry-run',
    issue_url: input.issueUrl,
  }
  const telemetry: LoopTelemetry = {
    issue_id: input.issue,
    mode: input.mode,
    iterations_budget: 1,
    iterations_used: input.iterationsUsed,
    started_at: input.startedAt,
    completed_at: input.completedAt,
    command_results: input.commandResults,
    side_effects_attempted: input.sideEffectsAttempted,
  }

  const statePath = writeJson(input.rootDir, 'autopilot-state.json', state)
  const telemetryPath = writeJson(input.rootDir, 'loop-telemetry.json', telemetry)
  return { status: input.status, exitCode: input.status === 'blocked' ? 1 : 0, statePath, telemetryPath }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const repo = options.repo ?? resolveRepo()
  const result = await runYallaAutopilot({ ...options, repo })
  console.log(JSON.stringify(result, null, 2))
  process.exitCode = result.exitCode
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
