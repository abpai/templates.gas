import {
  getJSONSchema,
  getDeveloperPrompt,
  buildUserMessage,
} from './extractionPrompt'
import { Extraction } from './extractionSchema'
import { InlineFile } from './prepareProductFiles'

/**
 * Call OpenAI Chat API with structured output using inline Base64 files.
 */
export const callOpenAIWithFiles = (inlineFiles: InlineFile[]): Extraction => {
  const request = buildOpenAIRequest(inlineFiles)
  const response = UrlFetchApp.fetch(request.url, request)
  return parseOpenAIResponse(response)
}

/**
 * Call OpenAI Chat API for multiple products in parallel using UrlFetchApp.fetchAll()
 */
export const callOpenAIWithFilesBatch = (
  productFiles: InlineFile[][],
): Array<Extraction | null> => {
  if (productFiles.length === 0) {
    return []
  }

  const requests = productFiles.map((files) => buildOpenAIRequest(files))
  const responses = UrlFetchApp.fetchAll(requests)

  return responses.map((response) => {
    try {
      return parseOpenAIResponse(response)
    } catch (error) {
      Logger.log(`OpenAI batch parsing error: ${error}`)
      return null
    }
  })
}

const buildOpenAIRequest = (
  inlineFiles: InlineFile[],
): GoogleAppsScript.URL_Fetch.URLFetchRequest => {
  const scriptProperties = PropertiesService.getScriptProperties()
  const apiKey = scriptProperties.getProperty('OPENAI_API_KEY')
  if (!apiKey) throw new Error('OPENAI_API_KEY not set')

  const resolvedModel =
    scriptProperties.getProperty('OPENAI_MODEL') || 'gpt-4.1'

  if (inlineFiles.length === 0) {
    throw new Error('buildOpenAIRequest() invoked with no files')
  }

  const userFiles = inlineFiles.map((f) => ({
    filename: f.driveFileName,
    mimeType: f.mimeType,
    fileBase64: f.fileBase64,
  }))

  const messages = [
    {
      role: 'developer',
      content: getDeveloperPrompt(),
    },
    {
      role: 'user',
      content: buildUserMessage({ files: userFiles }),
    },
  ]

  const requestBody: any = {
    model: resolvedModel,
    messages: messages,
    response_format: getJSONSchema(),
    store: true,
  }

  // Only add temperature for models that support it (not o[n] series)
  if (resolvedModel.startsWith('gpt-')) {
    requestBody.temperature = parseFloat(
      scriptProperties.getProperty('OPENAI_TEMPERATURE') || '1',
    )
  }

  return {
    url: 'https://api.openai.com/v1/chat/completions',
    method: 'post',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true,
  }
}

const parseOpenAIResponse = (
  response: GoogleAppsScript.URL_Fetch.HTTPResponse,
): Extraction => {
  let json: any
  try {
    json = JSON.parse(response.getContentText())
  } catch (error) {
    throw new Error(`Invalid JSON response from OpenAI: ${error}`)
  }

  if (response.getResponseCode() === 200) {
    if (!json.choices || json.choices.length === 0) {
      throw new Error('No choices returned in OpenAI response')
    }
    if (!json.choices[0].message || !json.choices[0].message.content) {
      throw new Error('No content returned in OpenAI response')
    }
    const content = json.choices[0].message.content
    try {
      return JSON.parse(content)
    } catch (_) {
      throw new Error(`Invalid JSON content from OpenAI: ${content}`)
    }
  } else {
    Logger.log(`OpenAI API error: ${JSON.stringify(json)}`)
    throw new Error(json.error?.message || 'API call failed')
  }
}

export const testOpenAIConnection = (): boolean => {
  const apiKey =
    PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY')

  if (!apiKey) {
    Logger.log('❌ Please set OPENAI_API_KEY in Script Properties first')
    return false
  }

  try {
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: 'get',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      muteHttpExceptions: true,
    }

    const response = UrlFetchApp.fetch(
      'https://api.openai.com/v1/models',
      options,
    )

    if (response.getResponseCode() === 200) {
      Logger.log('✅ OpenAI connection successful!')
      const models = JSON.parse(response.getContentText())
      Logger.log(`Found ${models.data.length} models`)
      return true
    } else {
      Logger.log(`❌ OpenAI connection failed: ${response.getContentText()}`)
      return false
    }
  } catch (error) {
    Logger.log(`❌ Connection error: ${error}`)
    return false
  }
}

export const saveOpenAISettings = (settings: {
  apiKey: string
  model: string
  temperature?: string
}): void => {
  const { apiKey, model, temperature } = settings
  const scriptProperties = PropertiesService.getScriptProperties()

  if (apiKey) {
    scriptProperties.setProperty('OPENAI_API_KEY', apiKey)
    if (!testOpenAIConnection()) {
      throw new Error('API key saved but connection test failed')
    }
  }

  if (model) {
    scriptProperties.setProperty('OPENAI_MODEL', model)
  } else {
    scriptProperties.deleteProperty('OPENAI_MODEL')
  }

  if (temperature !== undefined && temperature !== '') {
    const tempValue = parseFloat(temperature)
    if (isNaN(tempValue) || tempValue < 0 || tempValue > 1) {
      throw new Error('Temperature must be a number between 0 and 1')
    }
    scriptProperties.setProperty('OPENAI_TEMPERATURE', temperature)
  } else {
    scriptProperties.deleteProperty('OPENAI_TEMPERATURE')
  }
}
