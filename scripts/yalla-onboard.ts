#!/usr/bin/env tsx

import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { loadYallaConfig, type LoadedYallaConfig } from './yalla-config.js'

const execFileAsync = promisify(execFile)

type CommandResult = {
  stdout: string
  stderr: string
  exitCode: number
}

type CommandRunner = (command: string, args: string[]) => Promise<CommandResult>

type CheckStatus = 'pass' | 'warn' | 'fail'

type Check = {
  name: string
  status: CheckStatus
  detail: string
}

type OnboardOptions = {
  command: 'check' | 'labels' | 'template'
  rootDir?: string
  configPath?: string
  dryRun?: boolean
  apply?: boolean
  commandRunner?: CommandRunner
}

const DEFAULT_LABELS = [
  { name: 'yalla-ready', color: '0E8A16', description: 'Ready for Yalla automation' },
  { name: 'blocked', color: 'B60205', description: 'Blocked from execution' },
  { name: 'needs-human', color: 'D93F0B', description: 'Needs human clarification' },
  { name: 'do-not-autopilot', color: '5319E7', description: 'Never select for autopilot' },
  { name: 'p0', color: 'B60205', description: 'Highest priority' },
  { name: 'p1', color: 'D93F0B', description: 'High priority' },
  { name: 'p2', color: 'FBCA04', description: 'Normal priority' },
]

export type OnboardResult = {
  exitCode: number
  checks?: Check[]
  missingLabels?: string[]
  commands?: string[]
  templateTarget?: string
  applied?: boolean
}

function parseArgs(argv: string[]): OnboardOptions {
  const command = argv[0]
  if (command !== 'check' && command !== 'labels' && command !== 'template') {
    throw new Error('Usage: tsx scripts/yalla-onboard.ts check|labels|template [--config path] [--dry-run|--apply]')
  }

  let configPath: string | undefined
  let dryRun = false
  let apply = false
  for (let index = 1; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === '--config') configPath = argv[++index] ?? ''
    else if (arg === '--dry-run') dryRun = true
    else if (arg === '--apply') apply = true
    else throw new Error(`Unknown arg: ${arg}`)
  }

  return { command, configPath, dryRun, apply }
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

export async function runYallaOnboard(options: OnboardOptions): Promise<OnboardResult> {
  const rootDir = options.rootDir ?? process.cwd()
  const loadedConfig = loadYallaConfig({ rootDir, configPath: options.configPath })
  const targetRoot = loadedConfig.rootDir
  if (options.command === 'check') return runCheck(targetRoot, loadedConfig, options.commandRunner ?? defaultCommandRunner)
  if (options.command === 'labels') return runLabels(targetRoot, loadedConfig, options.commandRunner ?? defaultCommandRunner, Boolean(options.apply))
  return runTemplate(targetRoot, loadedConfig, Boolean(options.apply))
}

async function runCheck(rootDir: string, loadedConfig: LoadedYallaConfig, commandRunner: CommandRunner): Promise<OnboardResult> {
  const checks: Check[] = []
  const config = loadedConfig.config
  checks.push({ name: 'config', status: loadedConfig.path ? 'pass' : 'fail', detail: loadedConfig.path ?? 'Missing .claude/YALLA.md or --config path' })
  checks.push({ name: 'base_branch', status: config.baseBranch ? 'pass' : 'fail', detail: config.baseBranch ?? 'Missing base_branch' })
  checks.push({ name: 'tracking_mode', status: config.trackingMode ? 'pass' : 'warn', detail: config.trackingMode ?? 'Defaulting to github' })
  checks.push(commandCheck('commands.test', config.commands.test))
  checks.push(commandCheck('commands.typecheck', config.commands.typecheck))
  checks.push(commandCheck('commands.build', config.commands.build))
  checks.push(commandCheck('commands.lint', config.commands.lint))
  checks.push({ name: 'test_dir', status: config.testDir && existsSync(resolve(rootDir, config.testDir)) ? 'pass' : 'warn', detail: config.testDir ?? 'Missing test_dir' })
  checks.push({ name: 'autopilot_default', status: config.autopilot.enabled ? 'warn' : 'pass', detail: config.autopilot.enabled ? 'Autopilot enabled; confirm readiness checklist passed' : 'Autopilot disabled by default' })

  const auth = await commandRunner('gh', ['auth', 'status'])
  checks.push({ name: 'github_auth', status: auth.exitCode === 0 ? 'pass' : 'warn', detail: auth.exitCode === 0 ? 'gh authenticated' : 'gh unavailable or unauthenticated; file-only fallback expected' })

  if (auth.exitCode === 0 && (config.trackingMode ?? 'github') === 'github') {
    const labels = await missingLabels(commandRunner, requiredLabels(loadedConfig), config.repo)
    checks.push({ name: 'github_labels', status: labels.length ? 'warn' : 'pass', detail: labels.length ? `Missing labels: ${labels.join(', ')}` : 'Required labels exist' })
  } else if ((config.trackingMode ?? 'github') !== 'github') {
    checks.push({ name: 'github_labels', status: 'pass', detail: `Skipped for tracking_mode=${config.trackingMode}` })
  }

  const hasFailure = checks.some(check => check.status === 'fail')
  return { exitCode: hasFailure ? 1 : 0, checks }
}

function commandCheck(name: string, value: string | undefined): Check {
  if (value === '') return { name, status: 'warn', detail: 'Gate intentionally skipped' }
  if (value) return { name, status: 'pass', detail: value }
  return { name, status: 'fail', detail: 'Missing command or explicit empty string' }
}

async function runLabels(_rootDir: string, loadedConfig: LoadedYallaConfig, commandRunner: CommandRunner, apply: boolean): Promise<OnboardResult> {
  const labels = requiredLabels(loadedConfig)
  const missing = await missingLabels(commandRunner, labels, loadedConfig.config.repo)
  const commands = missing.map(label => {
    const definition = DEFAULT_LABELS.find(item => item.name === label)
    return definition
      ? `gh label create ${definition.name} --color ${definition.color} --description "${definition.description}"`
      : `gh label create ${label}`
  })

  if (apply) {
    for (const label of missing) {
      const definition = DEFAULT_LABELS.find(item => item.name === label)
      const args = ['label', 'create', label]
      if (loadedConfig.config.repo) args.push('--repo', loadedConfig.config.repo)
      if (definition) args.push('--color', definition.color, '--description', definition.description)
      const result = await commandRunner('gh', args)
      if (result.exitCode !== 0) return { exitCode: 1, missingLabels: missing, commands, applied: false }
    }
  }

  return { exitCode: 0, missingLabels: missing, commands, applied: apply }
}

async function missingLabels(commandRunner: CommandRunner, labels: string[], repo?: string) {
  const args = ['label', 'list', '--json', 'name']
  if (repo) args.push('--repo', repo)
  const result = await commandRunner('gh', args)
  if (result.exitCode !== 0) return labels
  const existing = parseLabelNames(result.stdout)
  return labels.filter(label => !existing.has(label))
}

function parseLabelNames(stdout: string) {
  try {
    const parsed = JSON.parse(stdout) as Array<{ name?: string }>
    return new Set(parsed.map(label => label.name).filter(Boolean) as string[])
  } catch {
    return new Set<string>()
  }
}

function requiredLabels(loadedConfig: LoadedYallaConfig) {
  const config = loadedConfig.config
  return unique([
    config.taskSystem.readyLabel || 'yalla-ready',
    ...config.taskSystem.blockLabels,
    ...config.taskSystem.priorityLabels,
    ...config.autopilot.eligibleLabels,
    ...config.autopilot.blockLabels,
  ].filter(Boolean))
}

function unique(values: string[]) {
  return [...new Set(values)]
}

function runTemplate(rootDir: string, loadedConfig: LoadedYallaConfig, apply: boolean): OnboardResult {
  const target = resolve(rootDir, loadedConfig.config.taskSystem.issueTemplate || '.github/ISSUE_TEMPLATE/yalla-task.md')
  if (apply) {
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, readFileSync(templateSource(), 'utf8'))
  }
  return { exitCode: 0, templateTarget: target, applied: apply }
}

function templateSource() {
  const currentDir = dirname(fileURLToPath(import.meta.url))
  return resolve(currentDir, '../docs/onboarding/templates/yalla-task.md')
}

async function main() {
  const result = await runYallaOnboard(parseArgs(process.argv.slice(2)))
  console.log(JSON.stringify(result, null, 2))
  process.exitCode = result.exitCode
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
