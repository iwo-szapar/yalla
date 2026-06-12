import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  containsLikelySecret,
  testInventorySchema,
  validateTestInventory,
  type TestInventoryViolation,
} from '../schemas/test-inventory.js'

type TestInventoryFixture = {
  id: string
  expected_valid: boolean
  sealed_rubric?: unknown
  input: unknown
}

type LoadedFixture = {
  id: string
  expected_valid: boolean
  input?: unknown
  loader_rejected: boolean
}

export type TestInventoryAdapter = {
  readInventory: () => unknown
  readFixtures: () => LoadedFixture[]
  fileExists: (path: string) => boolean
  readPackageScripts: () => Record<string, string>
}

export type TestInventoryFixtureResult = {
  id: string
  expected_valid: boolean
  valid: boolean
  matched_expectation: boolean
  violations: number
  sealed_rubric_hidden: boolean
  loader_rejected: boolean
}

function currentDir() {
  return dirname(fileURLToPath(import.meta.url))
}

function loadJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(resolve(currentDir(), relativePath), 'utf8')) as T
}

export function loadTestInventory() {
  return loadJson<unknown>('../test-inventory.json')
}

export function loadTestInventoryFixtures(fixtures = loadJson<TestInventoryFixture[]>('../data/test-inventory-fixtures.json')) {
  return fixtures.map(({ id, expected_valid, input }): LoadedFixture => {
    if (containsLikelySecret(input)) {
      return { id, expected_valid, loader_rejected: true }
    }

    return { id, expected_valid, input, loader_rejected: false }
  })
}

function repoPath(path: string) {
  return resolve(currentDir(), '../../..', path)
}

function loadPackageScripts() {
  const packageJson = JSON.parse(readFileSync(repoPath('package.json'), 'utf8')) as { scripts?: Record<string, string> }
  return packageJson.scripts ?? {}
}

export const defaultTestInventoryAdapter: TestInventoryAdapter = {
  readInventory: loadTestInventory,
  readFixtures: loadTestInventoryFixtures,
  fileExists: path => existsSync(repoPath(path)),
  readPackageScripts: loadPackageScripts,
}

function collectReferenceViolations(
  input: unknown,
  adapter: Pick<TestInventoryAdapter, 'fileExists' | 'readPackageScripts'>
) {
  const parsed = testInventorySchema.safeParse(input)
  if (!parsed.success) {
    return []
  }

  const violations: TestInventoryViolation[] = []
  const packageScripts = adapter.readPackageScripts()

  for (const entry of parsed.data.categories) {
    for (const testPath of entry.existing_tests) {
      if (!adapter.fileExists(testPath)) {
        violations.push({
          path: `categories.${entry.category}.existing_tests`,
          message: `Referenced test file does not exist: ${testPath}.`,
        })
      }
    }

    for (const command of entry.commands) {
      const match = command.match(/^npm run ([^\s]+)/)
      if (match && !packageScripts[match[1]]) {
        violations.push({
          path: `categories.${entry.category}.commands`,
          message: `Referenced npm script does not exist: ${match[1]}.`,
        })
      }
    }
  }

  return violations
}

export function runTestInventoryFixtures(adapter: TestInventoryAdapter = defaultTestInventoryAdapter) {
  const inventoryInput = adapter.readInventory()
  const inventory = validateTestInventory(inventoryInput)
  const referenceViolations = collectReferenceViolations(inventoryInput, adapter)
  const fixtures = adapter.readFixtures()
  const fixtureResults: TestInventoryFixtureResult[] = fixtures.map(fixture => {
    if (fixture.loader_rejected) {
      return {
        id: fixture.id,
        expected_valid: fixture.expected_valid,
        valid: false,
        matched_expectation: fixture.expected_valid === false,
        violations: 1,
        sealed_rubric_hidden: true,
        loader_rejected: true,
      }
    }

    const validation = validateTestInventory(fixture.input)
    const inputAsText = JSON.stringify(fixture.input)

    return {
      id: fixture.id,
      expected_valid: fixture.expected_valid,
      valid: validation.valid,
      matched_expectation: validation.valid === fixture.expected_valid,
      violations: validation.violations.length,
      sealed_rubric_hidden: !inputAsText.includes('sealed_rubric') && !inputAsText.includes('judge_notes'),
      loader_rejected: false,
    }
  })

  const fixturesPassed = fixtureResults.every(result => result.matched_expectation && result.sealed_rubric_hidden)
  const passed = inventory.valid && referenceViolations.length === 0 && fixturesPassed

  return {
    passed,
    summary: {
      inventory_valid: inventory.valid,
      inventory_verdict: inventory.verdict,
      inventory_violations: inventory.violations.length + referenceViolations.length,
      fixtures: fixtureResults.length,
      fixtures_passed: fixturesPassed,
    },
    categories: inventory.categories,
    violations: [...inventory.violations, ...referenceViolations],
    fixtures: fixtureResults,
  }
}

function main() {
  const report = runTestInventoryFixtures()
  console.log(JSON.stringify(report, null, 2))
  if (!report.passed) {
    process.exitCode = 1
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
