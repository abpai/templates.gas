import { setupFolders } from './fileScanner'
import { syncFilesWithJobsTracker } from './jobsTracker'
import { processNextItem } from './processingEngine'
import { enableAutoSync, disableAutoSync, autoSyncTrigger } from './autoSync'
import { testOpenAIConnection, saveOpenAISettings } from './openaiClient'
import { testGeminiConnection, saveGeminiSettings } from './geminiClient'
import aiDocumentTestSidebarHtml from './html/aiDocumentTestSidebar.html?raw'
import aiModelSettingsSidebarHtml from './html/aiModelSettingsSidebar.html?raw'
import { callOpenAIWithFiles } from './openaiClient'
import { callGeminiWithFiles } from './geminiClient'

// Expose all functions that should be callable from the menu to the global object.
global.setupFolders = setupFolders
global.syncFilesWithJobsTracker = syncFilesWithJobsTracker
global.processNextItem = processNextItem
global.enableAutoSync = enableAutoSync
global.disableAutoSync = disableAutoSync
global.autoSyncTrigger = autoSyncTrigger
global.testOpenAIConnection = testOpenAIConnection
global.testGeminiConnection = testGeminiConnection

const aiDocumentTestSidebar = (): void => {
  const html = HtmlService.createHtmlOutput(aiDocumentTestSidebarHtml)
  SpreadsheetApp.getUi().showSidebar(html)
}
global.aiDocumentTestSidebar = aiDocumentTestSidebar

const testDocument = (
  fileBase64: string,
  fileName: string,
  provider: string,
): any => {
  try {
    const inlineFile = {
      driveFileId: '',
      driveFileName: fileName,
      mimeType: 'application/pdf',
      fileBase64,
      bytes: Utilities.base64Decode(fileBase64).length,
    }

    Logger.log(`Testing document with ${provider} provider for extraction`)

    if (provider === 'gemini') {
      return callGeminiWithFiles([inlineFile])
    }
    return callOpenAIWithFiles([inlineFile])
  } catch (error) {
    Logger.log(`Error in testDocument: ${error}`)
    throw error
  }
}
global.testDocument = testDocument

const aiModelSettingsSidebar = (): void => {
  const scriptProperties = PropertiesService.getScriptProperties()
  const openaiEnabled =
    scriptProperties.getProperty('OPENAI_ENABLED') !== 'false'
  const openaiModel = scriptProperties.getProperty('OPENAI_MODEL') || 'gpt-4.1'
  const openaiTemperature =
    scriptProperties.getProperty('OPENAI_TEMPERATURE') || '1'
  const geminiEnabled =
    scriptProperties.getProperty('GEMINI_ENABLED') === 'true'
  const geminiModel =
    scriptProperties.getProperty('GEMINI_MODEL') || 'gemini-2.5-pro'

  const template = HtmlService.createTemplate(aiModelSettingsSidebarHtml)
  template.openaiEnabled = openaiEnabled
  template.openaiModel = openaiModel
  template.openaiTemperature = openaiTemperature
  template.geminiEnabled = geminiEnabled
  template.geminiModel = geminiModel

  const html = template.evaluate()
  SpreadsheetApp.getUi().showSidebar(html)
}
global.aiModelSettingsSidebar = aiModelSettingsSidebar

const saveAIModelSettings = (settings: {
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
}): void => {
  const scriptProperties = PropertiesService.getScriptProperties()

  scriptProperties.setProperty(
    'OPENAI_ENABLED',
    settings.openai.enabled.toString(),
  )

  saveOpenAISettings({
    apiKey:
      settings.openai.apiKey ||
      scriptProperties.getProperty('OPENAI_API_KEY') ||
      '',
    model: settings.openai.model,
    temperature: settings.openai.temperature,
  })

  scriptProperties.setProperty(
    'GEMINI_ENABLED',
    settings.gemini.enabled.toString(),
  )
  saveGeminiSettings({
    apiKey:
      settings.gemini.apiKey ||
      scriptProperties.getProperty('GEMINI_API_KEY') ||
      '',
    model: settings.gemini.model,
  })
}
global.saveAIModelSettings = saveAIModelSettings

/**
 * Standard Apps Script function that runs when the Google Sheet is opened.
 * Adds a custom menu to the Google Sheets UI.
 */
global.onOpen = (): void => {
  SpreadsheetApp.getUi()
    .createMenu('Document AI')
    .addItem('Setup AI Models', 'aiModelSettingsSidebar')
    .addSeparator()
    .addItem('Sync Jobs Tracker', 'syncFilesWithJobsTracker')
    .addItem('Process Next Document', 'processNextItem')
    .addSeparator()
    .addSubMenu(
      SpreadsheetApp.getUi()
        .createMenu('Auto-Sync')
        .addItem('Enable Auto-Sync', 'enableAutoSync')
        .addItem('Disable Auto-Sync', 'disableAutoSync'),
    )
    .addSeparator()
    .addSubMenu(
      SpreadsheetApp.getUi()
        .createMenu('Tests')
        .addItem('Test Document', 'aiDocumentTestSidebar')
        .addItem('Test OpenAI Connection', 'testOpenAIConnection')
        .addItem('Test Gemini Connection', 'testGeminiConnection'),
    )
    .addToUi()
  Logger.log('Custom menu added.')
}
