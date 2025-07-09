import {
  getJSONSchema,
  getDeveloperPrompt,
  buildUserMessage,
} from './extractionPrompt'
import { Extraction } from './extractionSchema'
import { InlineFile } from './prepareProductFiles'

/**
 * Call Google Gemini API with structured output using inline Base64 files.
 */
export const callGeminiWithFiles = (inlineFiles: InlineFile[]): Extraction => {
  const request = buildGeminiRequest(inlineFiles)
  const response = UrlFetchApp.fetch(request.url, request)
  return parseGeminiResponse(response)
}

/**
 * Call Google Gemini API for multiple products in parallel using UrlFetchApp.fetchAll()
 */
export const callGeminiWithFilesBatch = (
  productFiles: InlineFile[][],
): Array<Extraction | null> => {
  if (productFiles.length === 0) {
    return []
  }

  const requests = productFiles.map((files) => buildGeminiRequest(files))
  const responses = UrlFetchApp.fetchAll(requests)

  return responses.map((response) => {
    try {
      return parseGeminiResponse(response)
    } catch (error) {
      Logger.log(`Gemini batch parsing error: ${error}`)
      return null
    }
  })
}

const buildGeminiRequest = (
  inlineFiles: InlineFile[],
): GoogleAppsScript.URL_Fetch.URLFetchRequest => {
  const scriptProperties = PropertiesService.getScriptProperties()
  const apiKey = scriptProperties.getProperty('GEMINI_API_KEY')
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set')
  }

  const resolvedModel =
    scriptProperties.getProperty('GEMINI_MODEL') || 'gemini-2.5-pro'

  if (inlineFiles.length === 0) {
    throw new Error('buildGeminiRequest() invoked with no files')
  }

  const userFiles = inlineFiles.map((f) => ({
    filename: f.driveFileName,
    mimeType: f.mimeType,
    fileBase64: f.fileBase64,
  }))

  const requestBody = {
    contents: [
      {
        parts: [
          ...getDeveloperPrompt('gemini'),
          ...buildUserMessage({ provider: 'gemini', files: userFiles }),
        ],
      },
    ],
    generation_config: {
      response_mime_type: 'application/json',
      response_schema: getJSONSchema('gemini'),
    },
  }

  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${apiKey}`,
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
    },
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true,
  }
}

const parseGeminiResponse = (
  response: GoogleAppsScript.URL_Fetch.HTTPResponse,
): Extraction => {
  let json: any
  try {
    json = JSON.parse(response.getContentText())
  } catch (error) {
    throw new Error(`Invalid JSON response from Gemini: ${error}`)
  }

  if (response.getResponseCode() === 200) {
    if (!json.candidates || json.candidates.length === 0) {
      throw new Error('No candidates returned in Gemini response')
    }
    if (
      !json.candidates[0].content ||
      !json.candidates[0].content.parts ||
      json.candidates[0].content.parts.length === 0
    ) {
      throw new Error('No content parts returned in Gemini response')
    }
    if (!json.candidates[0].content.parts[0].text) {
      throw new Error('No text content returned in Gemini response')
    }
    const content = json.candidates[0].content.parts[0].text
    try {
      return JSON.parse(content)
    } catch (_) {
      throw new Error(`Invalid JSON content from Gemini: ${content}`)
    }
  } else {
    Logger.log(`Gemini API error: ${JSON.stringify(json)}`)
    throw new Error(json.error?.message || 'API call failed')
  }
}

export const testGeminiConnection = (): boolean => {
  const apiKey =
    PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY')

  if (!apiKey) {
    Logger.log('❌ Please set GEMINI_API_KEY in Script Properties first')
    return false
  }

  try {
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: 'get',
      muteHttpExceptions: true,
    }

    const response = UrlFetchApp.fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      options,
    )

    if (response.getResponseCode() === 200) {
      Logger.log('✅ Gemini connection successful!')
      const models = JSON.parse(response.getContentText())
      Logger.log(`Found ${models.models.length} models`)
      return true
    } else {
      Logger.log(`❌ Gemini connection failed: ${response.getContentText()}`)
      return false
    }
  } catch (error) {
    Logger.log(`❌ Connection error: ${error}`)
    return false
  }
}

export const saveGeminiSettings = (settings: {
  apiKey: string
  model: string
}): void => {
  const { apiKey, model } = settings
  const scriptProperties = PropertiesService.getScriptProperties()

  if (apiKey) {
    scriptProperties.setProperty('GEMINI_API_KEY', apiKey)
    if (!testGeminiConnection()) {
      throw new Error('API key saved but connection test failed')
    }
  }

  if (model) {
    scriptProperties.setProperty('GEMINI_MODEL', model)
  } else {
    scriptProperties.deleteProperty('GEMINI_MODEL')
  }
}
