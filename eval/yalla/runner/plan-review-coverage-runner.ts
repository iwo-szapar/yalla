import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  planReviewCoverageKindSchema,
  validatePlanReviewCoverageSample,
  type PlanReviewCoverageKind,
} from '../schemas/plan-review-coverage.js'

type Fixture = {
  id: string
  kind: PlanReviewCoverageKind
  priority: string
  source: string
  legacy_should_fail: boolean
  patched_should_pass: boolean
  legacy: unknown
  patched: unknown
}

type FixtureResult = {
  id: string
  kind: PlanReviewCoverageKind
  priority: string
  legacy_failed_as_expected: boolean
  patched_passed_as_expected: boolean
  legacy_violations: number
  patched_violations: number
  source: string
}

function loadFixtures(): Fixture[] {
  const currentDir = dirname(fileURLToPath(import.meta.url))
  const fixturePath = resolve(currentDir, '../data/plan-review-coverage-fixtures.json')
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as Fixture[]
}

export function runPlanReviewCoverageFixtures(kind?: PlanReviewCoverageKind, fixtures = loadFixtures()) {
  const filteredFixtures = kind ? fixtures.filter(fixture => fixture.kind === kind) : fixtures
  const results: FixtureResult[] = filteredFixtures.map(fixture => {
    const legacy = validatePlanReviewCoverageSample(fixture.legacy)
    const patched = validatePlanReviewCoverageSample(fixture.patched)

    return {
      id: fixture.id,
      kind: fixture.kind,
      priority: fixture.priority,
      legacy_failed_as_expected: fixture.legacy_should_fail ? !legacy.valid : legacy.valid,
      patched_passed_as_expected: fixture.patched_should_pass ? patched.valid : !patched.valid,
      legacy_violations: legacy.violations.length,
      patched_violations: patched.violations.length,
      source: fixture.source,
    }
  })

  const p0 = results.filter(result => result.priority === 'P0')
  const beforePatchFailures = results.filter(result => result.legacy_failed_as_expected && result.legacy_violations > 0).length
  const passed =
    filteredFixtures.length > 0 &&
    beforePatchFailures > 0 &&
    results.every(result => result.legacy_failed_as_expected && result.patched_passed_as_expected)

  return {
    passed,
    summary: {
      kind: kind ?? 'all',
      total: results.length,
      p0: p0.length,
      before_patch_failures: beforePatchFailures,
      legacy_failing: results.every(result => result.legacy_failed_as_expected),
      patched_passing: results.every(result => result.patched_passed_as_expected),
    },
    results,
  }
}

function parseKind(argument: string | undefined) {
  if (!argument || argument === 'all') {
    return undefined
  }

  return planReviewCoverageKindSchema.parse(argument)
}

function main() {
  const report = runPlanReviewCoverageFixtures(parseKind(process.argv[2]))
  console.log(JSON.stringify(report, null, 2))
  if (!report.passed) {
    process.exitCode = 1
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
