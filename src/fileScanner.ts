import { getConfig } from './config'

/**
 * Gets a reference to a folder, creating it if it doesn't exist.
 * @param parentFolder The parent folder.
 * @param folderName The name of the folder to get or create.
 * @returns The folder.
 */
const getOrCreateFolder = (
  parentFolder: GoogleAppsScript.Drive.Folder,
  folderName: string,
): GoogleAppsScript.Drive.Folder => {
  const folders = parentFolder.getFoldersByName(folderName)
  if (folders.hasNext()) {
    return folders.next()
  }
  return parentFolder.createFolder(folderName)
}

/**
 * Sets up the required folder structure in Google Drive.
 * @returns An object with references to the created folders.
 */
export const setupFolders = () => {
  const config = getConfig()
  const parentFolder = DriveApp.getRootFolder() // Or a specific folder
  const root = getOrCreateFolder(parentFolder, config.rootFolderName)
  const input = getOrCreateFolder(root, config.inputFolderName)
  const processed = getOrCreateFolder(root, config.processedFolderName)
  const error = getOrCreateFolder(root, config.errorFolderName)

  return { root, input, processed, error }
}

/**
 * Scans the input folder for files.
 * @returns A list of files found in the input folder.
 */
export const scanForNewFiles = (): GoogleAppsScript.Drive.File[] => {
  const config = getConfig()
  const parentFolder = DriveApp.getFoldersByName(config.rootFolderName)
  if (!parentFolder.hasNext()) {
    Logger.log(
      `Root folder "${config.rootFolderName}" not found. Please run setup.`,
    )
    return []
  }
  const rootFolder = parentFolder.next()

  const inputFolders = rootFolder.getFoldersByName(config.inputFolderName)
  if (!inputFolders.hasNext()) {
    Logger.log(
      `Input folder "${config.inputFolderName}" not found. Please run setup.`,
    )
    return []
  }
  const inputFolder = inputFolders.next()

  const files: GoogleAppsScript.Drive.File[] = []
  const fileIterator = inputFolder.getFiles()
  while (fileIterator.hasNext()) {
    files.push(fileIterator.next())
  }
  Logger.log(`Found ${files.length} files in the input folder.`)
  return files
}
