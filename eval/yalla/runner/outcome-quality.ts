import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scoreOutcomeBatch } from '../schemas/outcome-quality.js'

function loadOutcomeRuns() {
  const currentDir = dirname(fileURLToPath(import.meta.url))
  const dataPath = resolve(currentDir, '../data/outcome-quality-runs.json')
  return JSON.parse(readFileSync(dataPath, 'utf8')) as unknown
}

export function runOutcomeQuality(input = loadOutcomeRuns()) {
  return scoreOutcomeBatch(input)
}

function main() {
  const report = runOutcomeQuality()
  console.log(JSON.stringify(report, null, 2))
  if (!report.passed) {
    process.exitCode = 1
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
