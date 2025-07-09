import { ExtractionSchema } from './extractionSchema'
import { zodResponseFormat } from 'openai/helpers/zod'
import { toGeminiSchema } from 'gemini-zod'

export const getDeveloperPrompt = (provider?: string): any[] => {
  const message = `Extract a summary and a list of topics from the provided document.

Return **only** a valid JSON object that conforms exactly to the schema below.`

  if (provider === 'gemini') return [{ text: message }]
  return [{ type: 'text', text: message }]
}

export const getJSONSchema = (provider?: string): any => {
  if (provider === 'gemini') return toGeminiSchema(ExtractionSchema)

  return zodResponseFormat(ExtractionSchema, 'extraction')
}

export const buildUserMessage = (params: {
  provider?: string
  files: Array<{ filename: string; mimeType: string; fileBase64: string }>
}): any[] => {
  const { provider, files } = params

  const text = 'Extract the requested information from the files provided.'

  if (provider === 'gemini') {
    return [
      { text },
      ...files.map((f) => ({
        inline_data: {
          mime_type: f.mimeType,
          data: f.fileBase64,
        },
      })),
    ]
  }

  return [
    ...files.map((f) => ({
      type: 'file',
      file: {
        filename: f.filename,
        file_data: `data:application/pdf;base64,${f.fileBase64}`,
      },
    })),
    {
      type: 'text',
      text,
    },
  ]
}
