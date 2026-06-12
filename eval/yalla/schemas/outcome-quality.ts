import { z } from 'zod'
import { outcomeVerdictSchema, proofModeSchema } from './proof-contract.js'

const issueIdSchema = z.string().regex(/^issue-\d+$/)
const artifactPathSchema = z.string().min(1).regex(/^(\.pipeline|plans|docs|eval|tests)\//)

export const outcomeCommandEvidenceSchema = z.object({
  command: z.string().min(1),
  status: z.enum(['pass', 'fail', 'blocked', 'not-run']),
  summary: z.string().min(1),
})

export const outcomeCriterionSchema = z.object({
  criterion: z.string().min(1),
  proof_mode: proofModeSchema,
  status: z.enum(['covered', 'accepted-risk', 'blocked']),
  evidence: z.string().min(1),
})

export const outcomeReviewCheckSchema = z.object({
  name: z.string().min(1),
  verdict: z.enum(['pass', 'fail', 'blocked']),
})

export const outcomePrCheckSchema = z.object({
  name: z.string().min(1),
  conclusion: z.enum(['SUCCESS', 'FAILURE', 'CANCELLED', 'SKIPPED', 'TIMED_OUT', 'ACTION_REQUIRED', 'NEUTRAL']),
  url: z.string().url(),
})

export const outcomeRunSchema = z.object({
  issue_id: issueIdSchema,
  issue_url: z.string().url(),
  issue_intent: z.string().min(1),
  pr: z.object({
    number: z.number().int().positive(),
    url: z.string().url(),
    merged_at: z.string().min(1),
    base: z.literal('staging'),
  }),
  yalla_run_mode: z.enum(['manual', 'semi-manual']),
  real_github_issue: z.literal(true),
  plan: z.object({
    path: artifactPathSchema.optional(),
    summary: z.string().min(1),
  }),
  acceptance_trace: z.object({
    criteria: z.array(outcomeCriterionSchema).min(1),
  }),
  test_evidence: z.object({
    commands: z.array(outcomeCommandEvidenceSchema).min(1),
    browser_evidence_required: z.boolean().default(false),
    browser_evidence: z.array(z.string().min(1)).default([]),
  }),
  review_results: z.object({
    checks: z.array(outcomeReviewCheckSchema).min(1),
  }),
  pr_checks: z.array(outcomePrCheckSchema).min(1),
  outcome: z.object({
    verdict: outcomeVerdictSchema,
    remaining_delta: z.array(z.string()).default([]),
    human_decisions_needed: z.array(z.string()).default([]),
  }),
})

export const outcomeBatchSchema = z.object({
  batch_id: z.string().min(1),
  source_branch: z.literal('origin/staging'),
  runs: z.array(outcomeRunSchema).min(1),
})

export type OutcomeRun = z.infer<typeof outcomeRunSchema>
export type OutcomeBatch = z.infer<typeof outcomeBatchSchema>

export type OutcomeQualityViolation = {
  path: string
  message: string
}

export type OutcomeQualityResult = {
  issue_id: string
  pr_number: number
  verdict: z.infer<typeof outcomeVerdictSchema> | 'INVALID'
  proven: boolean
  violations: OutcomeQualityViolation[]
}

export type OutcomeBatchResult = {
  passed: boolean
  summary: {
    total: number
    proven: number
    not_proven: number
    inconclusive: number
    invalid: number
  }
  results: OutcomeQualityResult[]
}

function addViolation(violations: OutcomeQualityViolation[], path: string, message: string) {
  violations.push({ path, message })
}

function zodIssuesToViolations(error: z.ZodError): OutcomeQualityViolation[] {
  return error.issues.map(issue => ({
    path: issue.path.join('.') || '<root>',
    message: issue.message,
  }))
}

function scoreParsedRun(run: OutcomeRun) {
  const violations: OutcomeQualityViolation[] = []

  if (run.outcome.verdict !== 'PROVEN') {
    addViolation(violations, 'outcome.verdict', 'Only PROVEN counts as proving-ground success.')
  }

  if (run.outcome.remaining_delta.length > 0) {
    addViolation(violations, 'outcome.remaining_delta', 'PROVEN outcome cannot have remaining delta.')
  }

  if (run.outcome.human_decisions_needed.length > 0) {
    addViolation(violations, 'outcome.human_decisions_needed', 'PROVEN outcome cannot require human decisions.')
  }

  const criteria = run.acceptance_trace.criteria
  if (criteria.some(criterion => criterion.status !== 'covered')) {
    addViolation(violations, 'acceptance_trace.criteria', 'Every acceptance criterion must be covered.')
  }
  if (!criteria.some(criterion => criterion.proof_mode !== 'model-judge' && criterion.proof_mode !== 'inconclusive')) {
    addViolation(violations, 'acceptance_trace.criteria', 'At least one deterministic proof mode is required.')
  }
  if (criteria.some(criterion => criterion.proof_mode === 'inconclusive')) {
    addViolation(violations, 'acceptance_trace.criteria', 'Inconclusive proof cannot count as covered outcome evidence.')
  }

  if (run.test_evidence.commands.some(command => command.status !== 'pass')) {
    addViolation(violations, 'test_evidence.commands', 'All test evidence commands must pass.')
  }

  if (run.test_evidence.browser_evidence_required && run.test_evidence.browser_evidence.length === 0) {
    addViolation(violations, 'test_evidence.browser_evidence', 'Required browser evidence is missing.')
  }

  if (run.review_results.checks.some(check => check.verdict !== 'pass')) {
    addViolation(violations, 'review_results.checks', 'All review checks must pass.')
  }

  if (run.pr_checks.length === 0 || run.pr_checks.some(check => check.conclusion !== 'SUCCESS')) {
    addViolation(violations, 'pr_checks', 'Every PR check must have SUCCESS conclusion.')
  }

  return {
    issue_id: run.issue_id,
    pr_number: run.pr.number,
    verdict: run.outcome.verdict,
    proven: violations.length === 0,
    violations,
  }
}

export function scoreOutcomeRun(input: unknown): OutcomeQualityResult {
  const parsed = outcomeRunSchema.safeParse(input)
  if (!parsed.success) {
    return {
      issue_id: 'invalid',
      pr_number: 0,
      verdict: 'INVALID',
      proven: false,
      violations: zodIssuesToViolations(parsed.error),
    }
  }

  return scoreParsedRun(parsed.data)
}

export function scoreOutcomeBatch(input: unknown): OutcomeBatchResult {
  const parsed = outcomeBatchSchema.safeParse(input)
  if (!parsed.success) {
    return {
      passed: false,
      summary: { total: 0, proven: 0, not_proven: 0, inconclusive: 0, invalid: 1 },
      results: [
        {
          issue_id: 'invalid',
          pr_number: 0,
          verdict: 'INVALID',
          proven: false,
          violations: zodIssuesToViolations(parsed.error),
        },
      ],
    }
  }

  const runResults = parsed.data.runs.map(scoreParsedRun)
  const results: OutcomeQualityResult[] = [...runResults]
  const uniqueIssues = new Set(parsed.data.runs.map(run => run.issue_id))
  const uniquePrs = new Set(parsed.data.runs.map(run => run.pr.number))

  if (parsed.data.runs.length < 5 || uniqueIssues.size < 5 || uniquePrs.size < 5) {
    results.push({
      issue_id: 'batch',
      pr_number: 0,
      verdict: 'INVALID',
      proven: false,
      violations: [{ path: 'runs', message: 'Outcome proving ground requires at least five unique real GitHub issues and PRs.' }],
    })
  }

  const summary = {
    total: parsed.data.runs.length,
    proven: runResults.filter(result => result.proven).length,
    not_proven: runResults.filter(result => result.verdict === 'NOT_PROVEN').length,
    inconclusive: runResults.filter(result => result.verdict === 'INCONCLUSIVE').length,
    invalid: results.filter(result => result.verdict === 'INVALID').length,
  }

  return {
    passed: summary.total >= 5 && summary.proven === summary.total && summary.not_proven === 0 && summary.inconclusive === 0 && summary.invalid === 0,
    summary,
    results,
  }
}
