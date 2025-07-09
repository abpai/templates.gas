// Extend the global object so assigning functions for Apps Script is type-safe
export {}

declare global {
  var onOpen: () => void
  var setupFolders: () => {
    root: GoogleAppsScript.Drive.Folder
    input: GoogleAppsScript.Drive.Folder
    processed: GoogleAppsScript.Drive.Folder
    error: GoogleAppsScript.Drive.Folder
  }
  var syncFilesWithJobsTracker: () => void
  var processNextItem: () => void
  var enableAutoSync: () => void
  var disableAutoSync: () => void
  var autoSyncTrigger: () => void
  var testOpenAIConnection: () => boolean
  var testGeminiConnection: () => boolean
  var aiDocumentTestSidebar: () => void
  var testDocument: (
    fileBase64: string,
    fileName: string,
    provider: string,
  ) => any
  var aiModelSettingsSidebar: () => void
  var saveAIModelSettings: (settings: {
    openai: {
      enabled: boolean
      apiKey: string
      model: string
      temperature: string
    }
    gemini: {
      enabled: boolean
      apiKey: string
      model: string
    }
  }) => void
}
