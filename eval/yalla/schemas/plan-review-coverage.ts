import { z } from 'zod'
import { proofModeSchema } from './proof-contract.js'

export const planReviewCoverageKindSchema = z.enum(['plan-quality', 'review-quality', 'test-coverage'])

const sourcePathSchema = z.string().min(1).regex(/^(docs|api|lib|src|tests|eval|\.claude)\//)
const incidentLearningPathSchema = z
  .string()
  .min(1)
  .regex(/^docs\/(incidents|learnings)\//)

const planQualitySampleSchema = z.object({
  kind: z.literal('plan-quality'),
  subsystem: z.string().min(1),
  scan_scope: z.enum(['relevant-subsystem', 'all-history', 'none']),
  required_relevant_sources: z.array(incidentLearningPathSchema).min(1),
  relevant_sources_checked: z.array(sourcePathSchema).default([]),
})

const interfaceDriftCaseSchema = z.object({
  name: z.string().min(1),
  schema_path: sourcePathSchema,
  consumer_path: sourcePathSchema,
})

const reviewFindingSchema = z.object({
  category: z.enum(['zod-interface-drift', 'test-gap', 'security', 'correctness', 'other']),
  severity: z.enum(['low', 'medium', 'high']),
  references: z.array(sourcePathSchema).default([]),
  summary: z.string().min(1),
})

const reviewQualitySampleSchema = z.object({
  kind: z.literal('review-quality'),
  interface_drift_cases: z.array(interfaceDriftCaseSchema).default([]),
  findings: z.array(reviewFindingSchema).default([]),
})

const testCoverageSampleSchema = z.object({
  kind: z.literal('test-coverage'),
  deterministic_seam_available: z.boolean(),
  proposed_proof_modes: z.array(proofModeSchema).min(1),
  coverage_refs: z.array(sourcePathSchema).default([]),
})

export const planReviewCoverageSampleSchema = z.discriminatedUnion('kind', [
  planQualitySampleSchema,
  reviewQualitySampleSchema,
  testCoverageSampleSchema,
])

export type PlanReviewCoverageKind = z.infer<typeof planReviewCoverageKindSchema>
export type PlanReviewCoverageSample = z.infer<typeof planReviewCoverageSampleSchema>

export type PlanReviewCoverageViolation = {
  path: string
  message: string
}

export type PlanReviewCoverageValidation = {
  valid: boolean
  kind: PlanReviewCoverageKind | 'invalid'
  violations: PlanReviewCoverageViolation[]
}

const deterministicProofModes = new Set(['existing-test', 'new-test', 'playwright', 'static-artifact'])

function addViolation(violations: PlanReviewCoverageViolation[], path: string, message: string) {
  violations.push({ path, message })
}

function validatePlanQuality(sample: Extract<PlanReviewCoverageSample, { kind: 'plan-quality' }>) {
  const violations: PlanReviewCoverageViolation[] = []

  if (sample.scan_scope === 'all-history') {
    addViolation(
      violations,
      'scan_scope',
      'Plan eval requires a relevant-subsystem incident/learnings scan, not an all-history scan.'
    )
  }

  if (sample.scan_scope === 'none') {
    addViolation(violations, 'scan_scope', 'Plan eval requires an incident/learnings scan for the relevant subsystem.')
  }

  if (!sample.required_relevant_sources.some(source => source.startsWith('docs/incidents/') || source.startsWith('docs/learnings/'))) {
    addViolation(violations, 'required_relevant_sources', 'Plan eval requires at least one incident or learning source.')
  }

  for (const source of sample.required_relevant_sources) {
    if (!sample.relevant_sources_checked.includes(source)) {
      addViolation(violations, 'relevant_sources_checked', `Missing relevant subsystem source: ${source}.`)
    }
  }

  return violations
}

function validateReviewQuality(sample: Extract<PlanReviewCoverageSample, { kind: 'review-quality' }>) {
  const violations: PlanReviewCoverageViolation[] = []

  for (const drift of sample.interface_drift_cases) {
    const matchingFinding = sample.findings.find(
      finding =>
        finding.category === 'zod-interface-drift' &&
        finding.references.includes(drift.schema_path) &&
        finding.references.includes(drift.consumer_path)
    )

    if (!matchingFinding) {
      addViolation(
        violations,
        'findings',
        `Review eval must catch Zod/interface drift for ${drift.schema_path} -> ${drift.consumer_path}.`
      )
    }
  }

  return violations
}

function validateTestCoverage(sample: Extract<PlanReviewCoverageSample, { kind: 'test-coverage' }>) {
  const violations: PlanReviewCoverageViolation[] = []
  const hasDeterministicProof = sample.proposed_proof_modes.some(mode => deterministicProofModes.has(mode))

  if (sample.deterministic_seam_available && !hasDeterministicProof) {
    addViolation(
      violations,
      'proposed_proof_modes',
      'Deterministic seams require deterministic proof; model-judge-only coverage is not enough.'
    )
  }

  if (hasDeterministicProof && sample.coverage_refs.length === 0) {
    addViolation(violations, 'coverage_refs', 'Deterministic proof modes require concrete coverage references.')
  }

  return violations
}

export function validatePlanReviewCoverageSample(input: unknown): PlanReviewCoverageValidation {
  const parsed = planReviewCoverageSampleSchema.safeParse(input)
  if (!parsed.success) {
    return {
      valid: false,
      kind: 'invalid',
      violations: parsed.error.issues.map(issue => ({
        path: issue.path.join('.') || '<root>',
        message: issue.message,
      })),
    }
  }

  const sample = parsed.data
  const violations =
    sample.kind === 'plan-quality'
      ? validatePlanQuality(sample)
      : sample.kind === 'review-quality'
        ? validateReviewQuality(sample)
        : validateTestCoverage(sample)

  return {
    valid: violations.length === 0,
    kind: sample.kind,
    violations,
  }
}
