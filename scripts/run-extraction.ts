#!/usr/bin/env tsx

import { program } from 'commander'
import {
  callOpenAI,
  callGeminiAI,
  ModelProviderOptions,
} from './model-providers'

interface CLIOptions {
  provider: 'openai' | 'gemini'
  model: string
  reasoningEffort?: 'low' | 'medium' | 'high'
  temperature?: number
  file: string
  sample: number
}

interface ExtractionResult {
  attempt: number
  response: any
}

const runExtraction = async (
  options: CLIOptions,
): Promise<ExtractionResult[]> => {
  const { provider, model, reasoningEffort, temperature, file, sample } =
    options

  const results: ExtractionResult[] = []

  console.log(
    `Running ${sample} extraction attempts with ${provider}/${model}...`,
  )
  const configDetails = [
    `Provider: ${provider}`,
    reasoningEffort ? `Reasoning effort: ${reasoningEffort}` : '',
    temperature !== undefined ? `Temperature: ${temperature}` : '',
  ]
    .filter(Boolean)
    .join(', ')
  console.log(configDetails)
  console.log()

  for (let i = 1; i <= sample; i++) {
    console.log(`Attempt ${i}/${sample}...`)

    try {
      const providerOptions: ModelProviderOptions = {
        files: [file],
        model,
        temperature,
        reasoningEffort,
      }

      const modelResponse =
        provider === 'openai'
          ? await callOpenAI(providerOptions)
          : await callGeminiAI(providerOptions)

      if (!modelResponse.success) {
        throw new Error(modelResponse.error || 'Model API request failed')
      }

      results.push({
        attempt: i,
        response: modelResponse.data,
      })

      console.log(`✓ Attempt ${i} completed`)
    } catch (error) {
      console.error(`✗ Attempt ${i} failed:`, error)
      throw error
    }
  }

  return results
}

const displayResults = (results: ExtractionResult[]): void => {
  console.log('\n' + '='.repeat(60))
  console.log('EXTRACTION RESULTS')
  console.log('='.repeat(60))

  results.forEach((result) => {
    console.log(`\nAttempt ${result.attempt}:`)
    console.log('-'.repeat(20))
    console.log(JSON.stringify(result.response, null, 2))
  })
}

program
  .name('run-extraction')
  .description('AI-powered document extraction')
  .version('1.0.0')

program
  .requiredOption('--provider <provider>', 'Model provider', (value) => {
    if (!['openai', 'gemini'].includes(value)) {
      throw new Error('Provider must be either "openai" or "gemini"')
    }
    return value as 'openai' | 'gemini'
  })
  .requiredOption(
    '--model <model>',
    'Model to use (e.g., gpt-4.1 for OpenAI, gemini-2.5-pro for Gemini)',
  )
  .option(
    '--reasoning-effort <effort>',
    'Reasoning effort for o3 models (OpenAI only)',
    (value) => {
      if (!['low', 'medium', 'high'].includes(value)) {
        throw new Error('Reasoning effort must be "low", "medium", or "high"')
      }
      return value as 'low' | 'medium' | 'high'
    },
  )
  .option(
    '--temperature <number>',
    'Temperature for models (0.0 to 2.0)',
    (value) => {
      const num = parseFloat(value)
      if (isNaN(num) || num < 0 || num > 2) {
        throw new Error('Temperature must be a number between 0.0 and 2.0')
      }
      return num
    },
  )
  .requiredOption('--file <file>', 'Path to the PDF file to extract')
  .option(
    '--sample <number>',
    'Number of extraction attempts',
    (value) => {
      const num = parseInt(value, 10)
      if (isNaN(num) || num < 1 || num > 10) {
        throw new Error('Sample must be a number between 1 and 10')
      }
      return num
    },
    1,
  )

program.parse()

const options = program.opts() as CLIOptions

if (options.provider === 'openai' && !process.env.OPENAI_API_KEY) {
  console.error(
    'Error: OPENAI_API_KEY environment variable is required for OpenAI provider',
  )
  process.exit(1)
}

if (options.provider === 'gemini' && !process.env.GEMINI_API_KEY) {
  console.error(
    'Error: GEMINI_API_KEY environment variable is required for Gemini provider',
  )
  process.exit(1)
}

if (options.reasoningEffort && options.provider !== 'openai') {
  console.error(
    'Error: --reasoning-effort is only supported with OpenAI provider',
  )
  process.exit(1)
}

if (options.reasoningEffort && !options.model.includes('o3')) {
  console.error('Error: --reasoning-effort is only supported with o3 models')
  process.exit(1)
}

;(async () => {
  try {
    console.log('Document AI Extraction')
    console.log('='.repeat(60))
    console.log(`File: ${options.file}`)
    console.log(`Provider: ${options.provider}`)
    console.log(`Model: ${options.model}`)
    if (options.reasoningEffort) {
      console.log(`Reasoning Effort: ${options.reasoningEffort}`)
    }
    if (options.temperature !== undefined) {
      console.log(`Temperature: ${options.temperature}`)
    }
    console.log(`Attempts: ${options.sample}`)
    console.log()

    const results = await runExtraction(options)

    displayResults(results)

    console.log('\n✓ Extraction completed successfully')
  } catch (error) {
    console.error('\n✗ Extraction failed:', error)
    process.exit(1)
  }
})()
