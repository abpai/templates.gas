export interface AppConfig {
  /** The name of the sheet that tracks file processing jobs. */
  jobsTrackerSheetName: string
  /** The name of the root folder in Google Drive for this project. */
  rootFolderName: string
  /** The subfolder for files that are waiting to be processed. */
  inputFolderName: string
  /** The subfolder for files that have been successfully processed. */
  processedFolderName: string
  /** The subfolder for files that failed to process. */
  errorFolderName: string
  /** The interval in minutes for the auto-sync trigger. */
  autoSyncIntervalMinutes: number
}

export const getConfig = (): AppConfig => {
  return {
    jobsTrackerSheetName: 'Jobs Tracker',
    rootFolderName: __ROOT_PATH__,
    inputFolderName: '1. Input',
    processedFolderName: '2. Processed',
    errorFolderName: '3. Error',
    autoSyncIntervalMinutes: 5,
  }
}
