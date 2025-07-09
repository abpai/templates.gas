#!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { program } from 'commander'
import { createWriteStream, WriteStream } from 'fs'
import { stringify, Stringifier } from 'csv-stringify'
import {
  callOpenAI,
  callGeminiAI,
  ModelProviderOptions,
  ModelResponse,
} from './model-providers'

interface BulkProcessOptions {
  folder: string
  output: string
  concurrency: number
  model: string
  provider: 'openai' | 'gemini'
  reasoningEffort?: 'low' | 'medium' | 'high'
  temperature?: number
  retries: number
  progressFile?: string
}

interface ProcessingProgress {
  completed: string[]
  failed: string[]
  totalFiles: number
  startTime: string
  lastUpdate: string
}

interface ProcessingResult {
  filename: string
  success: boolean
  data?: any
  error?: string
  attempts: number
}

class BulkProcessor {
  private options: BulkProcessOptions
  private progress: ProcessingProgress
  private csvWriter: WriteStream | null = null
  private csvStringifier: Stringifier | null = null
  private processedCount = 0
  private failedCount = 0
  private isShuttingDown = false

  constructor(options: BulkProcessOptions) {
    this.options = options
    this.progress = this.loadProgress()

    // Handle graceful shutdown
    process.on('SIGINT', () => this.gracefulShutdown())
    process.on('SIGTERM', () => this.gracefulShutdown())
  }

  private async gracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) return
    this.isShuttingDown = true

    console.log('\n🛑 Shutting down gracefully...')
    await this.closeCSV()
    this.saveProgress()
    process.exit(0)
  }

  private async closeCSV(): Promise<void> {
    return new Promise((resolve) => {
      if (this.csvStringifier) {
        this.csvStringifier.end()
        this.csvStringifier = null
      }
      if (this.csvWriter) {
        this.csvWriter.end(() => {
          this.csvWriter = null
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  private loadProgress(): ProcessingProgress {
    const progressFile =
      this.options.progressFile ||
      path.join('scripts', 'outputs', `progress-${this.options.model}.json`)

    if (fs.existsSync(progressFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(progressFile, 'utf8'))
        console.log(
          `Loaded progress: ${data.completed.length} completed, ${data.failed.length} failed`,
        )
        return data
      } catch (error) {
        console.warn(`⚠️  Failed to load progress file: ${error}`)
      }
    }

    return {
      completed: [],
      failed: [],
      totalFiles: 0,
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
    }
  }

  private saveProgress(): void {
    const progressFile =
      this.options.progressFile ||
      path.join('scripts', 'outputs', `progress-${this.options.model}.json`)
    this.progress.lastUpdate = new Date().toISOString()

    try {
      const progressDir = path.dirname(progressFile)
      if (!fs.existsSync(progressDir)) {
        fs.mkdirSync(progressDir, { recursive: true })
      }

      fs.writeFileSync(progressFile, JSON.stringify(this.progress, null, 2))
    } catch (error) {
      console.error(`❌ Failed to save progress: ${error}`)
    }
  }

  private async initializeCSV(): Promise<void> {
    const outputDir = path.dirname(this.options.output)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    try {
      this.csvWriter = createWriteStream(this.options.output)

      // Handle stream errors
      this.csvWriter.on('error', (error) => {
        console.error(`❌ CSV write error: ${error.message}`)
        throw error
      })

      const headers = ['File Name', 'Summary', 'Topics', 'Processed At']
      this.csvStringifier = stringify({ header: true, columns: headers })

      this.csvStringifier.on('error', (error) => {
        console.error(`❌ CSV stringify error: ${error.message}`)
        throw error
      })

      this.csvStringifier.pipe(this.csvWriter)
    } catch (error) {
      await this.closeCSV()
      throw new Error(`Failed to initialize CSV output: ${error.message}`)
    }
  }

  private writeDataToCSV(data: any, filename: string): void {
    if (!this.csvStringifier) return

    this.csvStringifier.write({
      'File Name': filename,
      Summary: data.summary,
      Topics: data.topics.join(', '),
      'Processed At': new Date().toISOString(),
    })
  }

  private async callModelProvider(
    filePath: string,
    retryCount = 0,
  ): Promise<any> {
    const modelOptions: ModelProviderOptions = {
      files: [filePath],
      model: this.options.model,
      temperature: this.options.temperature,
      reasoningEffort: this.options.reasoningEffort,
    }

    try {
      let response: ModelResponse

      if (this.options.provider === 'openai') {
        response = await callOpenAI(modelOptions)
      } else {
        response = await callGeminiAI(modelOptions)
      }

      if (!response.success) {
        throw new Error(response.error || 'Model provider request failed')
      }

      return response.data
    } catch (error) {
      if (retryCount < this.options.retries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000)
        console.log(
          `⏳ Retrying in ${delay}ms (attempt ${retryCount + 1}/${this.options.retries + 1})`,
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
        return this.callModelProvider(filePath, retryCount + 1)
      }
      throw error
    }
  }

  private async processFile(filename: string): Promise<ProcessingResult> {
    const filePath = path.join(this.options.folder, filename)
    console.log(`Processing: ${filename}`)

    let attempts = 0
    let lastError: string | undefined

    while (attempts <= this.options.retries) {
      try {
        attempts++
        const response = await this.callModelProvider(filePath, 0)
        return {
          filename,
          success: true,
          data: response,
          attempts,
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
        console.error(
          `❌ Attempt ${attempts} failed for ${filename}: ${lastError}`,
        )

        if (attempts <= this.options.retries) {
          const delay = Math.min(1000 * Math.pow(2, attempts - 1), 10000)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    return {
      filename,
      success: false,
      error: lastError,
      attempts,
    }
  }

  private async processWithConcurrency(files: string[]): Promise<void> {
    const queue = [...files]
    const inProgress = new Set<Promise<void>>()

    while (queue.length > 0 || inProgress.size > 0) {
      while (queue.length > 0 && inProgress.size < this.options.concurrency) {
        const filename = queue.shift()!

        const task = this.processFile(filename)
          .then((result) => {
            if (result.success) {
              this.processedCount++
              this.progress.completed.push(filename)
              this.writeDataToCSV(result.data, filename)
              console.log(
                `✅ Completed: ${filename} (${this.processedCount}/${this.progress.totalFiles})`,
              )
            } else {
              this.failedCount++
              this.progress.failed.push(filename)
              console.error(`❌ Failed: ${filename} - ${result.error}`)
            }

            if ((this.processedCount + this.failedCount) % 10 === 0) {
              this.saveProgress()
            }
          })
          .finally(() => {
            inProgress.delete(task)
          })

        inProgress.add(task)
      }

      if (inProgress.size > 0) {
        await Promise.race(inProgress)
      }
    }
  }

  async process(): Promise<void> {
    try {
      console.log('Starting bulk processing')
      console.log(`Folder: ${this.options.folder}`)
      console.log(`Output: ${this.options.output}`)
      console.log(`Concurrency: ${this.options.concurrency}`)
      console.log(`Model: ${this.options.model} (${this.options.provider})`)
      console.log(`Max retries: ${this.options.retries}`)
      console.log()

      // Validate input folder exists
      if (!fs.existsSync(this.options.folder)) {
        throw new Error(`Input folder does not exist: ${this.options.folder}`)
      }

      const allFiles = fs
        .readdirSync(this.options.folder)
        .filter((file) => file.toLowerCase().endsWith('.pdf'))
        .sort()

      console.log(`Found ${allFiles.length} PDF files`)

      const filesToProcess = allFiles.filter(
        (file) =>
          !this.progress.completed.includes(file) &&
          !this.progress.failed.includes(file),
      )

      console.log(
        ` ${filesToProcess.length} files to process (${this.progress.completed.length} already completed, ${this.progress.failed.length} failed)`,
      )

      if (filesToProcess.length === 0) {
        console.log('✅ All files already processed!')
        return
      }

      this.progress.totalFiles = allFiles.length
      this.saveProgress()

      await this.initializeCSV()

      const startTime = Date.now()
      await this.processWithConcurrency(filesToProcess)
      const endTime = Date.now()

      await this.closeCSV()
      this.saveProgress()

      console.log('\n' + '='.repeat(60))
      console.log('PROCESSING SUMMARY')
      console.log('='.repeat(60))
      console.log(`✅ Successfully processed: ${this.processedCount}`)
      console.log(`❌ Failed: ${this.failedCount}`)
      console.log(
        `⏱️  Total time: ${((endTime - startTime) / 1000).toFixed(2)}s`,
      )
      console.log(`Output saved to: ${this.options.output}`)

      if (this.progress.failed.length > 0) {
        console.log('\n❌ Failed files:')
        this.progress.failed.forEach((file) => console.log(`  - ${file}`))
        console.log('\nYou can rerun the script to retry failed files.')
      } else {
        const progressFile =
          this.options.progressFile ||
          path.join('scripts', 'outputs', `progress-${this.options.model}.json`)
        if (fs.existsSync(progressFile)) {
          try {
            fs.unlinkSync(progressFile)
            console.log(`Cleaned up progress file: ${progressFile}`)
          } catch (error) {
            console.warn(`⚠️  Failed to delete progress file: ${error}`)
          }
        }
      }
    } catch (error) {
      await this.closeCSV()
      throw error
    }
  }
}

program
  .name('bulk-process')
  .description('Bulk process PDF documents for extraction')
  .version('1.0.0')

program
  .option('--folder <folder>', 'Folder containing PDF files', 'documents')
  .option('--output <output>', 'Output CSV file path')
  .option(
    '--concurrency <number>',
    'Number of concurrent requests',
    (value) => {
      const num = parseInt(value, 10)
      if (isNaN(num) || num < 1 || num > 20) {
        throw new Error('Concurrency must be between 1 and 20')
      }
      return num
    },
    3,
  )
  .requiredOption(
    '--model <model>',
    'Model to use (e.g., gpt-4.1, gemini-2.5-pro)',
  )
  .option(
    '--provider <provider>',
    'AI provider to use (openai or gemini)',
    (value) => {
      if (!['openai', 'gemini'].includes(value)) {
        throw new Error('Provider must be either "openai" or "gemini"')
      }
      return value as 'openai' | 'gemini'
    },
    'openai',
  )
  .option(
    '--reasoning-effort <effort>',
    'Reasoning effort for o3 models',
    (value) => {
      if (!['low', 'medium', 'high'].includes(value)) {
        throw new Error('Reasoning effort must be "low", "medium", or "high"')
      }
      return value as 'low' | 'medium' | 'high'
    },
  )
  .option(
    '--temperature <number>',
    'Temperature for GPT models (0.0 to 2.0)',
    (value) => {
      const num = parseFloat(value)
      if (isNaN(num) || num < 0 || num > 2) {
        throw new Error('Temperature must be between 0.0 and 2.0')
      }
      return num
    },
  )
  .option(
    '--retries <number>',
    'Number of retries for failed requests',
    (value) => {
      const num = parseInt(value, 10)
      if (isNaN(num) || num < 0 || num > 10) {
        throw new Error('Retries must be between 0 and 10')
      }
      return num
    },
    3,
  )
  .option('--progress-file <file>', 'Custom progress file path')

program.parse()

const options = program.opts() as any

const defaultOutput = path.join(
  'scripts',
  'outputs',
  `results-${options.model}-${Date.now()}.csv`,
)

const fullOptions: BulkProcessOptions = {
  ...options,
  output: options.output || defaultOutput,
}

if (fullOptions.provider === 'openai' && !process.env.OPENAI_API_KEY) {
  console.error(
    '❌ Error: OPENAI_API_KEY environment variable is required for OpenAI provider',
  )
  process.exit(1)
}

if (fullOptions.provider === 'gemini' && !process.env.GEMINI_API_KEY) {
  console.error(
    '❌ Error: GEMINI_API_KEY environment variable is required for Gemini provider',
  )
  process.exit(1)
}

;(async () => {
  try {
    const processor = new BulkProcessor(fullOptions)
    await processor.process()
  } catch (error) {
    console.error('\n❌ Bulk processing failed:', error)
    process.exit(1)
  }
})()
