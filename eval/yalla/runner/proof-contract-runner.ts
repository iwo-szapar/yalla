import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateProofContract } from '../schemas/proof-contract.js'

type Fixture = {
  id: string
  priority: string
  held_out: boolean
  source: string
  legacy_should_fail: boolean
  patched_should_pass: boolean
  legacy: unknown
  patched: unknown
}

type FixtureResult = {
  id: string
  priority: string
  held_out: boolean
  legacy_failed_as_expected: boolean
  patched_passed_as_expected: boolean
  legacy_violations: number
  patched_violations: number
  source: string
}

function loadFixtures(): Fixture[] {
  const currentDir = dirname(fileURLToPath(import.meta.url))
  const fixturePath = resolve(currentDir, '../data/proof-contract-fixtures.json')
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as Fixture[]
}

export function runProofContractFixtures(fixtures = loadFixtures()) {
  const results: FixtureResult[] = fixtures.map(fixture => {
    const legacy = validateProofContract(fixture.legacy)
    const patched = validateProofContract(fixture.patched)

    return {
      id: fixture.id,
      priority: fixture.priority,
      held_out: fixture.held_out,
      legacy_failed_as_expected: fixture.legacy_should_fail ? !legacy.valid : legacy.valid,
      patched_passed_as_expected: fixture.patched_should_pass ? patched.valid : !patched.valid,
      legacy_violations: legacy.violations.length,
      patched_violations: patched.violations.length,
      source: fixture.source,
    }
  })

  const p0 = results.filter(result => result.priority === 'P0')
  const heldOut = results.filter(result => result.held_out)
  const beforePatchFailures = p0.filter(result => result.legacy_failed_as_expected && result.legacy_violations > 0).length
  const p0LegacyFailing = p0.every(result => result.legacy_failed_as_expected)
  const p0PatchedPassing = p0.every(result => result.patched_passed_as_expected)
  const heldOutPassing = heldOut.every(result => result.legacy_failed_as_expected && result.patched_passed_as_expected)
  const passed = beforePatchFailures > 0 && p0LegacyFailing && p0PatchedPassing && heldOutPassing

  return {
    passed,
    summary: {
      total: results.length,
      p0: p0.length,
      held_out: heldOut.length,
      before_patch_failures: beforePatchFailures,
      p0_legacy_failing: p0LegacyFailing,
      p0_patched_passing: p0PatchedPassing,
      held_out_passing: heldOutPassing,
    },
    results,
  }
}

function main() {
  const report = runProofContractFixtures()
  console.log(JSON.stringify(report, null, 2))
  if (!report.passed) {
    process.exitCode = 1
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
