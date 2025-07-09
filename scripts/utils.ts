import fs from 'fs'
import path from 'path'

// 50MB limit for base64 encoding to prevent memory issues
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

export const readFileAsBase64 = (filePath: string): string => {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`)
    }

    // Check file size
    const stats = fs.statSync(filePath)
    if (stats.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `File too large: ${stats.size} bytes. Maximum allowed: ${MAX_FILE_SIZE_BYTES} bytes (${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)}MB)`,
      )
    }

    // Validate it's a regular file
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${filePath}`)
    }

    // Read and encode
    const fileBuffer = fs.readFileSync(filePath)
    return fileBuffer.toString('base64')
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read file as base64: ${error.message}`)
    }
    throw new Error(`Failed to read file as base64: ${String(error)}`)
  }
}

export const findMatchingFiles = (directory: string): string[] => {
  try {
    // Check if directory exists
    if (!fs.existsSync(directory)) {
      throw new Error(`Directory does not exist: ${directory}`)
    }

    // Check if it's actually a directory
    const stats = fs.statSync(directory)
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${directory}`)
    }

    const allFiles = fs.readdirSync(directory)

    return allFiles.filter((file) => {
      const lower = file.toLowerCase()
      const fullPath = path.join(directory, file)

      // Only include regular files that are PDFs
      try {
        const fileStats = fs.statSync(fullPath)
        return fileStats.isFile() && lower.endsWith('.pdf')
      } catch {
        // Skip files we can't stat
        return false
      }
    })
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to find matching files: ${error.message}`)
    }
    throw new Error(`Failed to find matching files: ${String(error)}`)
  }
}

export const filterResponseForComparison = (response: any): any => {
  // For the generic schema, we can just return the whole response
  return response
}

export const validatePdfFile = (filePath: string): boolean => {
  try {
    // Check if file exists and is readable
    if (!fs.existsSync(filePath)) {
      return false
    }

    const stats = fs.statSync(filePath)
    if (!stats.isFile()) {
      return false
    }

    // Basic PDF validation - check if file starts with PDF magic number
    const buffer = Buffer.alloc(4)
    const fd = fs.openSync(filePath, 'r')
    fs.readSync(fd, buffer, 0, 4, 0)
    fs.closeSync(fd)

    // PDF files start with "%PDF"
    return buffer.toString('ascii') === '%PDF'
  } catch {
    return false
  }
}
