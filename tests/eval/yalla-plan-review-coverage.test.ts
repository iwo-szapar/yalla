import { describe, expect, it } from 'vitest'
import { runPlanReviewCoverageFixtures } from '../../eval/yalla/runner/plan-review-coverage-runner.js'
import { runYallaSmoke } from '../../eval/yalla/runner/smoke-runner.js'
import { validatePlanReviewCoverageSample } from '../../eval/yalla/schemas/plan-review-coverage.js'

describe('yalla plan review coverage evals', () => {
  it('passes the full PRD 03 fixture suite', () => {
    const report = runPlanReviewCoverageFixtures()

    expect(report.passed).toBe(true)
    expect(report.summary.total).toBe(3)
    expect(report.summary.before_patch_failures).toBe(3)
    expect(report.summary.legacy_failing).toBe(true)
    expect(report.summary.patched_passing).toBe(true)
  })

  it('exposes a plan-quality eval that rejects all-history scans', () => {
    const report = runPlanReviewCoverageFixtures('plan-quality')
    const result = validatePlanReviewCoverageSample({
      kind: 'plan-quality',
      subsystem: 'checkout',
      scan_scope: 'all-history',
      required_relevant_sources: ['docs/learnings/2026-05-06-checkout-surface-parity.md'],
      relevant_sources_checked: ['docs/learnings/2026-05-06-checkout-surface-parity.md'],
    })

    expect(report.passed).toBe(true)
    expect(result.valid).toBe(false)
    expect(result.violations.map(violation => violation.message)).toContain(
      'Plan eval requires a relevant-subsystem incident/learnings scan, not an all-history scan.'
    )
  })

  it('accepts relevant-subsystem incident and learning scans', () => {
    const result = validatePlanReviewCoverageSample({
      kind: 'plan-quality',
      subsystem: 'checkout',
      scan_scope: 'relevant-subsystem',
      required_relevant_sources: ['docs/learnings/2026-05-06-checkout-surface-parity.md'],
      relevant_sources_checked: ['docs/learnings/2026-05-06-checkout-surface-parity.md'],
    })

    expect(result.valid).toBe(true)
  })

  it('requires plan-quality sources to be incidents or learnings', () => {
    const result = validatePlanReviewCoverageSample({
      kind: 'plan-quality',
      subsystem: 'checkout',
      scan_scope: 'relevant-subsystem',
      required_relevant_sources: ['api/products.ts'],
      relevant_sources_checked: ['api/products.ts'],
    })

    expect(result.valid).toBe(false)
    expect(result.violations.some(violation => violation.path.includes('required_relevant_sources'))).toBe(true)
  })

  it('exposes a review-quality eval that catches Zod/interface drift', () => {
    const report = runPlanReviewCoverageFixtures('review-quality')
    const result = validatePlanReviewCoverageSample({
      kind: 'review-quality',
      interface_drift_cases: [
        {
          name: 'schema accepts field absent from writer',
          schema_path: 'lib/validation/product.ts',
          consumer_path: 'api/products.ts',
        },
      ],
      findings: [],
    })

    expect(report.passed).toBe(true)
    expect(result.valid).toBe(false)
    expect(result.violations.some(violation => violation.message.includes('Zod/interface drift'))).toBe(true)
  })

  it('exposes a test-coverage eval that rejects model-judge-only deterministic seams', () => {
    const report = runPlanReviewCoverageFixtures('test-coverage')
    const result = validatePlanReviewCoverageSample({
      kind: 'test-coverage',
      deterministic_seam_available: true,
      proposed_proof_modes: ['model-judge'],
      coverage_refs: [],
    })

    expect(report.passed).toBe(true)
    expect(result.valid).toBe(false)
    expect(result.violations.map(violation => violation.message)).toContain(
      'Deterministic seams require deterministic proof; model-judge-only coverage is not enough.'
    )
  })

  it('includes PRD 03 evals in yalla smoke', () => {
    const report = runYallaSmoke()

    expect(report.passed).toBe(true)
    expect(report.plan_review_coverage.before_patch_failures).toBe(3)
    expect(report.plan_review_coverage.patched_passing).toBe(true)
  })

  it('fails the runner when any non-P0 fixture fails', () => {
    const report = runPlanReviewCoverageFixtures(undefined, [
      {
        id: 'p0-valid',
        kind: 'plan-quality',
        priority: 'P0',
        source: 'docs/prds/active/yalla-sbf-autopilot-evals/03-plan-review-test-coverage-evals.md',
        legacy_should_fail: true,
        patched_should_pass: true,
        legacy: {
          kind: 'plan-quality',
          subsystem: 'checkout',
          scan_scope: 'all-history',
          required_relevant_sources: ['docs/learnings/2026-05-06-checkout-surface-parity.md'],
          relevant_sources_checked: ['docs/learnings/2026-05-06-checkout-surface-parity.md'],
        },
        patched: {
          kind: 'plan-quality',
          subsystem: 'checkout',
          scan_scope: 'relevant-subsystem',
          required_relevant_sources: ['docs/learnings/2026-05-06-checkout-surface-parity.md'],
          relevant_sources_checked: ['docs/learnings/2026-05-06-checkout-surface-parity.md'],
        },
      },
      {
        id: 'p1-invalid',
        kind: 'test-coverage',
        priority: 'P1',
        source: 'docs/prds/active/yalla-sbf-autopilot-evals/03-plan-review-test-coverage-evals.md',
        legacy_should_fail: true,
        patched_should_pass: true,
        legacy: {
          kind: 'test-coverage',
          deterministic_seam_available: true,
          proposed_proof_modes: ['model-judge'],
          coverage_refs: [],
        },
        patched: {
          kind: 'test-coverage',
          deterministic_seam_available: true,
          proposed_proof_modes: ['model-judge'],
          coverage_refs: [],
        },
      },
    ])

    expect(report.passed).toBe(false)
    expect(report.summary.p0).toBe(1)
    expect(report.summary.patched_passing).toBe(false)
  })
})
