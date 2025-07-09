import { getConfig } from './config'
import { scanForNewFiles } from './fileScanner'

export enum JobStatus {
  Todo = 'To Process',
  Processing = 'Processing',
  Done = 'Processed',
  Error = 'Error',
}

const { jobsTrackerSheetName } = getConfig()

/**
 * Gets the Jobs Tracker sheet, creating it if it doesn't exist.
 * @returns The Jobs Tracker sheet.
 */
export const getJobsTrackerSheet = (): GoogleAppsScript.Spreadsheet.Sheet => {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = spreadsheet.getSheetByName(jobsTrackerSheetName)
  if (!sheet) {
    sheet = spreadsheet.insertSheet(jobsTrackerSheetName)
    sheet.appendRow(['File ID', 'File Name', 'Status', 'Timestamp', 'Notes'])
    sheet.setFrozenRows(1)
  }
  return sheet
}

/**
 * Scans for files in the input folder and updates the Jobs Tracker sheet.
 * Adds new files and updates existing files that have been moved back to input.
 */
export const syncFilesWithJobsTracker = (): void => {
  const sheet = getJobsTrackerSheet()
  const files = scanForNewFiles()
  const data = sheet.getDataRange().getValues()

  const existingRows = new Map() // fileId -> { row, status, fileName }

  for (let i = 1; i < data.length; i++) {
    const [fileId, fileName, status] = data[i]
    existingRows.set(fileId, {
      row: i + 1,
      status,
      fileName,
    })
  }

  let updatedCount = 0
  let addedCount = 0

  files.forEach((file) => {
    const fileId = file.getId()
    const fileName = file.getName()

    if (existingRows.has(fileId)) {
      const existing = existingRows.get(fileId)
      const needsStatusUpdate =
        existing.status === JobStatus.Error ||
        existing.status === JobStatus.Done
      const needsNameUpdate = existing.fileName !== fileName

      if (needsStatusUpdate || needsNameUpdate) {
        const row = existing.row
        sheet
          .getRange(row, 1, 1, 5)
          .setValues([
            [
              fileId,
              fileName,
              JobStatus.Todo,
              new Date(),
              needsStatusUpdate
                ? 'File moved back to input folder.'
                : 'File name updated.',
            ],
          ])
        updatedCount++
      }
    } else {
      sheet.appendRow([
        fileId,
        fileName,
        JobStatus.Todo,
        new Date(),
        'New file detected.',
      ])
      addedCount++
    }
  })

  SpreadsheetApp.flush()
  Logger.log(
    `Jobs Tracker synced: ${addedCount} new files added, ${updatedCount} files updated.`,
  )
}

/**
 * Finds the next job that needs to be processed.
 * @returns The row number and file ID of the next job, or null if none are found.
 */
export const findNextJob = (): { row: number; fileId: string } | null => {
  const sheet = getJobsTrackerSheet()
  const data = sheet.getDataRange().getValues()
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === JobStatus.Todo) {
      return { row: i + 1, fileId: data[i][0] }
    }
  }
  return null
}

/**
 * Updates the status of a job in the Jobs Tracker sheet.
 * @param row The row number of the job to update.
 * @param status The new status.
 * @param notes Optional notes to add.
 */
export const updateJobStatus = (
  row: number,
  status: JobStatus,
  notes?: string,
): void => {
  const sheet = getJobsTrackerSheet()
  sheet.getRange(row, 3).setValue(status)
  sheet.getRange(row, 4).setValue(new Date())
  if (notes) {
    sheet.getRange(row, 5).setValue(notes)
  }
}
