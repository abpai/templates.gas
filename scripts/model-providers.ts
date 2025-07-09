import {
  getDeveloperPrompt,
  buildUserMessage,
  getJSONSchema,
} from '../src/extractionPrompt'
import { readFileAsBase64 } from './utils'

export interface ModelProviderOptions {
  files: string[]
  model?: string
  temperature?: number
  reasoningEffort?: 'low' | 'medium' | 'high'
}

export interface ModelResponse {
  success: boolean
  data?: any
  error?: string
  rawResponse?: any
}

export const callOpenAI = async (
  options: ModelProviderOptions,
): Promise<ModelResponse> => {
  const { files, model = 'gpt-4.1', temperature, reasoningEffort } = options

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { success: false, error: 'OpenAI API key not found' }
  }

  try {
    // Validate input files exist
    for (const file of files) {
      try {
        readFileAsBase64(file) // This will throw if file doesn't exist
      } catch (error) {
        return {
          success: false,
          error: `File not found or unreadable: ${file}`,
        }
      }
    }

    const messages = [
      {
        role: 'developer',
        content: getDeveloperPrompt(),
      },
      {
        role: 'user',
        content: buildUserMessage({
          files: files.map((file) => ({
            filename: file.split('/').pop() || '',
            mimeType: 'application/pdf',
            fileBase64: readFileAsBase64(file),
          })),
        }),
      },
    ]

    const body: any = {
      model,
      messages,
      response_format: getJSONSchema(),
      store: true,
    }

    if (model.startsWith('gpt-') && temperature !== undefined) {
      body.temperature = temperature
    }

    if (model.includes('o3') && reasoningEffort) {
      body.reasoning_effort = reasoningEffort
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error?.message || 'OpenAI API request failed',
        rawResponse: result,
      }
    }

    // Validate response structure
    if (
      !result.choices ||
      !Array.isArray(result.choices) ||
      result.choices.length === 0
    ) {
      return {
        success: false,
        error: 'Invalid response structure: missing choices array',
        rawResponse: result,
      }
    }

    const choice = result.choices[0]
    if (!choice.message || typeof choice.message.content !== 'string') {
      return {
        success: false,
        error: 'Invalid response structure: missing message content',
        rawResponse: result,
      }
    }

    const content = choice.message.content
    if (!content.trim()) {
      return {
        success: false,
        error: 'Empty response content',
        rawResponse: result,
      }
    }

    try {
      const parsedContent = JSON.parse(content)
      return {
        success: true,
        data: parsedContent,
        rawResponse: result,
      }
    } catch (parseError) {
      return {
        success: false,
        error: `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`,
        rawResponse: result,
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

export const callGeminiAI = async (
  options: ModelProviderOptions,
): Promise<ModelResponse> => {
  const { files, model = 'gemini-2.5-pro', temperature } = options

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { success: false, error: 'Gemini API key not found' }
  }

  try {
    // Validate input files exist
    for (const file of files) {
      try {
        readFileAsBase64(file) // This will throw if file doesn't exist
      } catch (error) {
        return {
          success: false,
          error: `File not found or unreadable: ${file}`,
        }
      }
    }

    const requestBody = {
      contents: [
        {
          parts: [
            ...getDeveloperPrompt('gemini'),
            ...buildUserMessage({
              provider: 'gemini',
              files: files.map((file) => ({
                filename: file.split('/').pop() || '',
                mimeType: 'application/pdf',
                fileBase64: readFileAsBase64(file),
              })),
            }),
          ],
        },
      ],
      generation_config: {
        response_mime_type: 'application/json',
        response_schema: getJSONSchema('gemini'),
        ...(temperature !== undefined && { temperature }),
      },
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
    )

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error?.message || 'Gemini API request failed',
        rawResponse: result,
      }
    }

    // Validate response structure
    if (
      !result.candidates ||
      !Array.isArray(result.candidates) ||
      result.candidates.length === 0
    ) {
      return {
        success: false,
        error: 'Invalid response structure: missing candidates array',
        rawResponse: result,
      }
    }

    const candidate = result.candidates[0]
    if (
      !candidate.content ||
      !candidate.content.parts ||
      !Array.isArray(candidate.content.parts) ||
      candidate.content.parts.length === 0
    ) {
      return {
        success: false,
        error: 'Invalid response structure: missing content parts',
        rawResponse: result,
      }
    }

    const content = candidate.content.parts[0]?.text
    if (typeof content !== 'string') {
      return {
        success: false,
        error: 'Invalid response structure: missing or invalid text content',
        rawResponse: result,
      }
    }

    if (!content.trim()) {
      return {
        success: false,
        error: 'Empty response content',
        rawResponse: result,
      }
    }

    try {
      const parsedContent = JSON.parse(content)
      return {
        success: true,
        data: parsedContent,
        rawResponse: result,
      }
    } catch (parseError) {
      return {
        success: false,
        error: `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`,
        rawResponse: result,
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
