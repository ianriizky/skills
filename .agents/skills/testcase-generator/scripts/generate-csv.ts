#!/usr/bin/env bun
/// <reference types="bun-types" />
/**
 * Test Case CSV Generator
 *
 * Reads a JSON file with test case data and produces a Master Template CSV
 * with proper headers, module separator rows, and CSV quoting.
 *
 * Usage:
 *   bun generate-csv.ts <input.json> <output.csv>
 *
 * Input JSON format:
 * {
 *   "prefix": "CW",
 *   "language": "en",
 *   "modules": [
 *     {
 *       "name": "Wallet and Bank Account",
 *       "tests": [
 *         {
 *           "scenario": "Verify Wallet Hub display",
 *           "precondition": "Active agent has one active wallet",
 *           "steps": "Sign in as agent, open Wallet Hub",
 *           "expected": "Wallet card shows agent name, balance, status",
 *           "testData": "agent_id: ag_001, wallet_status: active",
 *           "type": "Positive",
 *           "priority": "High"
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

interface TestCase {
  scenario: string
  precondition: string
  steps: string
  expected: string
  testData: string
  type: string
  priority: string
}

interface ModuleGroup {
  name: string
  tests: TestCase[]
}

interface InputData {
  prefix: string
  language?: string
  modules: ModuleGroup[]
}

// CSV cell quoting per RFC 4180
function quoteCsvField(value: string): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Quote if contains comma, double quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }

  return str
}

function buildRow(fields: string[]): string {
  return fields.map(quoteCsvField).join(',')
}

function generateId(prefix: string, counter: number): string {
  const padded = String(counter).padStart(3, '0')
  return `${prefix}-TC-${padded}`
}

function generateCsv(data: InputData): string {
  const lines: string[] = []

  // Row 1: Main header
  const header1 = buildRow([
    'ID',
    'Test Scenario',
    'Module/Feature',
    'Precondition',
    'Test Steps',
    'Expected Result',
    'Test Data',
    'Type',
    'Priority',
    'Staging Status',
    '',
    '',
    'Tester',
    'Last Updated',
    '',
    'Production Status',
    '',
    '',
    'Tester',
    'Last Updated',
    'Notes / Bug Ref',
  ])

  lines.push(header1)

  // Row 2: Sub-header (Desktop/Tablet/Mobile labels)
  const header2 = buildRow([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Desktop',
    'Tablet',
    'Mobile',
    '',
    '',
    '',
    'Desktop',
    'Tablet',
    'Mobile',
    '',
    '',
    '',
  ])

  lines.push(header2)

  // Row 3: Empty separator
  lines.push(','.repeat(20))

  // Test case rows grouped by module
  let counter = 1

  for (const mod of data.modules) {
    // Test case rows (module indicated in Module/Feature column, no separator rows)
    for (const test of mod.tests) {
      const id = generateId(data.prefix, counter)

      const row = buildRow([
        id,
        test.scenario,
        mod.name,
        test.precondition,
        test.steps,
        test.expected,
        test.testData,
        test.type,
        test.priority,
        // Columns 10-21: all empty (filled by testers during execution)
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ])

      lines.push(row)
      counter++
    }
  }

  return lines.join('\n') + '\n'
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.error('Usage: bun generate-csv.ts <input.json> <output.csv>')
    console.error('')
    console.error('Input JSON format:')

    console.error(
      '{"prefix": "CW", "language": "en", "modules": [{"name": "...", "tests": [{"scenario": "...", "precondition": "...", "steps": "...", "expected": "...", "testData": "...", "type": "Positive", "priority": "High"}]}]}',
    )

    process.exit(1)
  }

  const inputPath = args[0]
  const outputPath = args[1]

  // Read input JSON
  const inputFile = Bun.file(inputPath)

  if (!(await inputFile.exists())) {
    console.error(`Error: Input file not found: ${inputPath}`)
    process.exit(1)
  }

  const inputText = await inputFile.text()
  let data: InputData

  try {
    data = JSON.parse(inputText)
  } catch (e) {
    console.error(`Error: Failed to parse JSON: ${(e as Error).message}`)
    process.exit(1)
  }

  // Validate
  if (!data.prefix || typeof data.prefix !== 'string') {
    console.error("Error: 'prefix' field is required and must be a string")
    process.exit(1)
  }

  if (!data.modules || !Array.isArray(data.modules) || data.modules.length === 0) {
    console.error("Error: 'modules' field is required and must be a non-empty array")
    process.exit(1)
  }

  // Generate CSV
  const csv = generateCsv(data)

  // Write output
  await Bun.write(outputPath, csv)
  console.log(`Generated ${csv.split('\n').length - 1} rows → ${outputPath}`)
}

void main()
