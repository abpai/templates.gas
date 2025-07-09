import { Extraction } from './extractionSchema'

export interface ExtractionData extends Extraction {
  fileName: string
}

const EXTRACTION_SHEET_NAME = 'Extractions'

/**
 * Get or create the Extractions sheet with proper headers
 */
export const getExtractionSheet = (): GoogleAppsScript.Spreadsheet.Sheet => {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = spreadsheet.getSheetByName(EXTRACTION_SHEET_NAME)

  if (!sheet) {
    sheet = spreadsheet.insertSheet(EXTRACTION_SHEET_NAME)
    setupExtractionHeaders(sheet)
  }

  return sheet
}

/**
 * Set up the Extractions sheet headers and formatting
 */
const setupExtractionHeaders = (
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
): void => {
  const headers = ['File Name', 'Summary', 'Topics', 'Last Updated']

  const headerRange = sheet.getRange(1, 1, 1, headers.length)
  headerRange.setValues([headers])
  headerRange.setFontWeight('bold')
  headerRange.setBackground('#4285f4')
  headerRange.setFontColor('#ffffff')

  // Set column widths
  sheet.setColumnWidth(1, 300) // File Name
  sheet.setColumnWidth(2, 500) // Summary
  sheet.setColumnWidth(3, 300) // Topics
  sheet.setColumnWidth(4, 150) // Last Updated

  // Freeze header
  sheet.setFrozenRows(1)
}

/**
 * Update or insert a product in the Extractions sheet
 */
export const updateExtractionSheet = (data: ExtractionData): void => {
  const sheet = getExtractionSheet()
  const fileName = data.fileName

  // Find existing row
  const dataRange = sheet.getDataRange()
  const values = dataRange.getValues()
  let rowIndex = -1

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === fileName) {
      rowIndex = i + 1
      break
    }
  }

  // Prepare row data
  const rowData = [
    data.fileName,
    data.summary,
    data.topics.join(', '),
    new Date().toLocaleString(),
  ]

  if (rowIndex > 0) {
    // Update existing row
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData])
  } else {
    // Append new row
    sheet.appendRow(rowData)
  }
}
