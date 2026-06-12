import { describe, expect, it } from 'vitest'
import { runOutcomeQuality } from '../../eval/yalla/runner/outcome-quality.js'
import { runYallaSmoke } from '../../eval/yalla/runner/smoke-runner.js'
import { scoreOutcomeBatch, scoreOutcomeRun } from '../../eval/yalla/schemas/outcome-quality.js'

function buildRun(overrides: Record<string, unknown> = {}) {
  return {
    issue_id: 'issue-1171',
    issue_url: 'https://github.com/example-owner/example-repo/issues/1171',
    issue_intent: 'Prove outcome quality with deterministic evidence.',
    pr: {
      number: 1177,
      url: 'https://github.com/example-owner/example-repo/pull/1177',
      merged_at: '2026-06-09T16:00:00Z',
      base: 'staging',
    },
    yalla_run_mode: 'semi-manual',
    real_github_issue: true,
    plan: {
      path: 'plans/issue-1171-outcome-proving-ground.md',
      summary: 'Score completed PR outcome evidence.',
    },
    acceptance_trace: {
      criteria: [
        {
          criterion: 'Outcome eval scores deterministic evidence.',
          proof_mode: 'new-test',
          status: 'covered',
          evidence: 'tests/eval/yalla-outcome-quality.test.ts',
        },
      ],
    },
    test_evidence: {
      commands: [{ command: 'npm run eval:yalla:outcome-quality', status: 'pass', summary: 'Outcome eval passed.' }],
      browser_evidence_required: false,
      browser_evidence: [],
    },
    review_results: {
      checks: [{ name: 'evidence-check', verdict: 'pass' }],
    },
    pr_checks: [
      {
        name: 'Typecheck, lint, unit tests',
        conclusion: 'SUCCESS',
        url: 'https://github.com/example-owner/example-repo/actions/runs/1/job/1',
      },
    ],
    outcome: {
      verdict: 'PROVEN',
      remaining_delta: [],
      human_decisions_needed: [],
    },
    ...overrides,
  }
}

describe('yalla outcome quality evals', () => {
  it('passes the five-run proving ground dataset', () => {
    const report = runOutcomeQuality()

    expect(report.passed).toBe(true)
    expect(report.summary.total).toBe(5)
    expect(report.summary.proven).toBe(5)
    expect(report.summary.inconclusive).toBe(0)
    expect(report.summary.invalid).toBe(0)
  })

  it('does not count INCONCLUSIVE as success', () => {
    const result = scoreOutcomeRun(
      buildRun({
        outcome: {
          verdict: 'INCONCLUSIVE',
          remaining_delta: ['Browser evidence was blocked.'],
          human_decisions_needed: [],
        },
      })
    )

    expect(result.proven).toBe(false)
    expect(result.verdict).toBe('INCONCLUSIVE')
    expect(result.violations.map(violation => violation.message)).toContain('Only PROVEN counts as proving-ground success.')
  })

  it('rejects missing PR checks', () => {
    const result = scoreOutcomeRun(buildRun({ pr_checks: [] }))

    expect(result.proven).toBe(false)
    expect(result.verdict).toBe('INVALID')
    expect(result.violations.some(violation => violation.path === 'pr_checks')).toBe(true)
  })

  it('rejects failed PR checks', () => {
    const result = scoreOutcomeRun(
      buildRun({
        pr_checks: [
          {
            name: 'Typecheck, lint, unit tests',
            conclusion: 'FAILURE',
            url: 'https://github.com/example-owner/example-repo/actions/runs/1/job/1',
          },
        ],
      })
    )

    expect(result.proven).toBe(false)
    expect(result.violations.map(violation => violation.message)).toContain('Every PR check must have SUCCESS conclusion.')
  })

  it('requires at least five unique real issues and PRs', () => {
    const report = scoreOutcomeBatch({
      batch_id: 'too-small',
      source_branch: 'origin/staging',
      runs: [
        buildRun({ issue_id: 'issue-1', pr: { ...buildRun().pr, number: 1 } }),
        buildRun({ issue_id: 'issue-2', pr: { ...buildRun().pr, number: 2 } }),
        buildRun({ issue_id: 'issue-3', pr: { ...buildRun().pr, number: 3 } }),
        buildRun({ issue_id: 'issue-4', pr: { ...buildRun().pr, number: 4 } }),
      ],
    })

    expect(report.passed).toBe(false)
    expect(report.summary.total).toBe(4)
    expect(report.summary.proven).toBe(4)
    expect(report.summary.invalid).toBe(1)
    expect(report.results.some(result => result.issue_id === 'batch')).toBe(true)
  })

  it('includes outcome quality in yalla smoke', () => {
    const report = runYallaSmoke()

    expect(report.passed).toBe(true)
    expect(report.outcome_quality.proven).toBe(5)
    expect(report.outcome_quality.not_proven).toBe(0)
  })
})
