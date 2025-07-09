import { findNextJob, updateJobStatus, JobStatus } from './jobsTracker'
import { getConfig } from './config'
import { callOpenAIWithFiles } from './openaiClient'
import { callGeminiWithFiles } from './geminiClient'
import { prepareProductFiles } from './prepareProductFiles'
import { updateExtractionSheet } from './sheetUpdater'
import { Extraction } from './extractionSchema'

/**
 * This is the placeholder for your custom file processing logic.
 *
 * @param file The Google Drive file to process.
 * @returns A string with the result of the processing.
 */
const processFile = (file: GoogleAppsScript.Drive.File): string => {
  const preparedFiles = prepareProductFiles([
    { fileId: file.getId(), fileName: file.getName() },
  ])
  if (preparedFiles.length === 0) {
    throw new Error('File could not be prepared for processing.')
  }

  const scriptProperties = PropertiesService.getScriptProperties()
  const openaiEnabled =
    scriptProperties.getProperty('OPENAI_ENABLED') !== 'false'
  const geminiEnabled =
    scriptProperties.getProperty('GEMINI_ENABLED') === 'true'

  let extraction: Extraction

  if (openaiEnabled) {
    Logger.log('Using OpenAI to process file.')
    extraction = callOpenAIWithFiles(preparedFiles)
  } else if (geminiEnabled) {
    Logger.log('Using Gemini to process file.')
    extraction = callGeminiWithFiles(preparedFiles)
  } else {
    throw new Error('No AI provider is enabled.')
  }

  updateExtractionSheet({
    fileName: file.getName(),
    summary: extraction.summary,
    topics: extraction.topics,
  })

  return `Successfully processed file. Summary: ${extraction.summary.substring(0, 100)}...`
}

/**
 * Processes the next available item from the Jobs Tracker.
 */
export const processNextItem = (): void => {
  const job = findNextJob()
  if (!job) {
    Logger.log('No items to process.')
    SpreadsheetApp.getActiveSpreadsheet().toast('No items to process.')
    return
  }

  const { row, fileId } = job
  updateJobStatus(row, JobStatus.Processing, 'Starting processing...')

  let file: GoogleAppsScript.Drive.File | null = null
  try {
    // Verify file exists before processing
    file = DriveApp.getFileById(fileId)
    if (!file) {
      throw new Error(`File with ID ${fileId} not found`)
    }

    const resultNotes = processFile(file)
    updateJobStatus(row, JobStatus.Done, resultNotes)

    // Move the file to the processed folder
    const config = getConfig()
    const rootFolders = DriveApp.getFoldersByName(config.rootFolderName)
    if (!rootFolders.hasNext()) {
      throw new Error(`Root folder "${config.rootFolderName}" not found.`)
    }
    const rootFolder = rootFolders.next()

    const processedFolders = rootFolder.getFoldersByName(
      config.processedFolderName,
    )
    if (!processedFolders.hasNext()) {
      throw new Error(
        `Processed folder "${config.processedFolderName}" not found.`,
      )
    }
    const processedFolder = processedFolders.next()
    file.moveTo(processedFolder)

    Logger.log(`Successfully processed file: ${file.getName()}`)
    SpreadsheetApp.getActiveSpreadsheet().toast(`Processed: ${file.getName()}`)
  } catch (e: any) {
    const errorMessage = e.message || 'An unknown error occurred.'
    updateJobStatus(row, JobStatus.Error, errorMessage)
    Logger.log(`Error processing file ID ${fileId}: ${errorMessage}`)
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Error processing file. See logs.',
    )

    // Optionally, move the file to the error folder
    try {
      if (file) {
        const config = getConfig()
        const rootFolders = DriveApp.getFoldersByName(config.rootFolderName)
        if (!rootFolders.hasNext()) {
          Logger.log(`Root folder "${config.rootFolderName}" not found.`)
          return
        }
        const rootFolder = rootFolders.next()
        const errorFolders = rootFolder.getFoldersByName(config.errorFolderName)
        if (!errorFolders.hasNext()) {
          Logger.log(`Error folder "${config.errorFolderName}" not found.`)
          return
        }
        const errorFolder = errorFolders.next()
        file.moveTo(errorFolder)
      }
    } catch (moveError: any) {
      Logger.log(
        `Failed to move file ${fileId} to error folder: ${moveError.message}`,
      )
    }
  }
}
