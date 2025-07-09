// ---------------------------------------------------------------------------------
// Inline-file support (Base64 embedded PDFs) – the new OpenAI recommended approach
// ---------------------------------------------------------------------------------

export interface InlineFile {
  driveFileId: string
  driveFileName: string
  mimeType: string
  fileBase64: string
  bytes: number
}

/**
 * Convert Drive files to Base64-embedded objects ready for inclusion directly
 * in the Chat Completions payload.
 */
export const prepareProductFiles = (
  files: Array<{ fileId: string; fileName: string }>,
): InlineFile[] => {
  const inlineFiles: InlineFile[] = []

  files.forEach((file) => {
    try {
      const driveFile = DriveApp.getFileById(file.fileId)
      const blob = driveFile.getBlob()
      const mimeType = blob.getContentType()

      // Only process PDF files
      if (mimeType !== 'application/pdf') {
        Logger.log(`Skipping non-PDF file: ${file.fileName} (${mimeType})`)
        return
      }

      const bytes = blob.getBytes()
      const base64 = Utilities.base64Encode(bytes)

      inlineFiles.push({
        driveFileId: file.fileId,
        driveFileName: file.fileName,
        mimeType: 'application/pdf',
        fileBase64: base64,
        bytes: bytes.length,
      })
    } catch (error) {
      Logger.log(`Failed to read ${file.fileName}: ${error}`)
    }
  })

  return inlineFiles
}
