import fs from 'fs'
import path from 'path'
import { program } from 'commander'
import { parse } from 'csv-parse/sync'

interface ExtractionRecord {
  fileName: string
  summary: string
  topics: string[]
}

const loadCsv = (filePath: string): ExtractionRecord[] => {
  const content = fs.readFileSync(filePath, 'utf8')
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[]

  return records.map((row) => {
    return {
      fileName: (row['File Name'] || '').trim(),
      summary: (row['Summary'] || '').trim(),
      topics: (row['Topics'] || '').split(',').map((t) => t.trim()),
    }
  })
}

const compare = (
  expected: ExtractionRecord[],
  actual: ExtractionRecord[],
): void => {
  const expectedMap = new Map<string, ExtractionRecord>()
  expected.forEach((rec) => expectedMap.set(rec.fileName, rec))

  let perfect = 0
  const mismatches: { fileName: string; differences: string[] }[] = []

  actual.forEach((actualRec) => {
    const exp = expectedMap.get(actualRec.fileName)
    if (!exp) return

    const differences: string[] = []

    if (actualRec.summary !== exp.summary) {
      differences.push('Summary mismatch')
    }

    const topics1 = new Set(actualRec.topics)
    const topics2 = new Set(exp.topics)
    if (
      topics1.size !== topics2.size ||
      ![...topics1].every((t) => topics2.has(t))
    ) {
      differences.push('Topics mismatch')
    }

    if (differences.length === 0) {
      perfect++
    } else {
      mismatches.push({ fileName: actualRec.fileName, differences })
    }
  })

  console.log('\n=== Evaluation Summary ===')
  console.log(`Total evaluated files: ${actual.length}`)
  console.log(`Perfect matches: ${perfect}`)
  console.log(`Mismatches: ${mismatches.length}`)

  if (mismatches.length > 0) {
    console.log('\nFiles with Mismatches:')
    mismatches.forEach((m) =>
      console.log(`- ${m.fileName}: ${m.differences.join(', ')}`),
    )
  }
}

program
  .requiredOption('--actual <file>', 'CSV file produced by bulk-process')
  .option(
    '--expected <file>',
    'Expected CSV ground truth',
    path.join('scripts', 'expected.csv'),
  )

program.parse()
const opts = program.opts()

const resolveFilePath = (filePath: string, defaultDir: string): string => {
  if (filePath.includes('/') || filePath.includes('\\')) {
    return filePath
  }
  return path.join(defaultDir, filePath)
}

const actualPath = resolveFilePath(
  opts.actual as string,
  path.join('scripts', 'outputs'),
)
const expectedPath = resolveFilePath(
  opts.expected as string,
  path.join('scripts', 'outputs'),
)

const expectedRecs = loadCsv(expectedPath)
const actualRecs = loadCsv(actualPath)

compare(expectedRecs, actualRecs)
