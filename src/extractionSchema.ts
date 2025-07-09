import { z } from 'zod'

export const ExtractionSchema = z.object({
  summary: z.string().describe('A summary of the document.'),
  topics: z
    .array(z.string())
    .describe('A list of topics covered in the document.'),
})

export type Extraction = z.infer<typeof ExtractionSchema>
