import { z } from 'zod'

// Mirrors the backend's SettingsOut, ModelOut and UsageOut (app/settings/schemas.py).
export const toolSchema = z.object({ name: z.string(), label: z.string(), description: z.string(), enabled: z.boolean() })

export const settingsSchema = z.object({
  tutor_model: z.string(),
  temperature: z.number(),
  max_tokens: z.number(),
  tools: z.array(toolSchema),
  show_usage: z.boolean(),
  embedding_model: z.string(),
  embedding_dimensions: z.number(),
  embedding_locked: z.boolean(),
})
export type DeveloperSettings = z.infer<typeof settingsSchema>

/** What PUT /settings takes; only what is sent changes. */
export type SettingsChange = Partial<Pick<DeveloperSettings, 'tutor_model' | 'temperature' | 'max_tokens' | 'show_usage'>> & {
  tools?: Record<string, boolean>
}

export const MAX_TOKENS_RANGE = { min: 128, max: 8192, step: 128 }
export const maxTokensSchema = z.number().int().min(MAX_TOKENS_RANGE.min).max(MAX_TOKENS_RANGE.max)

export const modelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  prompt: z.number().nullable(),
  completion: z.number().nullable(),
  // Whether the model uses a temperature; null when OpenRouter could not be asked.
  supports_temperature: z.boolean().nullable(),
})
export type ModelOption = z.infer<typeof modelSchema>
export const modelsSchema = z.array(modelSchema)

export const usageItemSchema = z.object({
  message_id: z.string(),
  question: z.string(),
  model: z.string().nullable(),
  tools: z.array(z.string()),
  tokens_in: z.number().nullable(),
  tokens_out: z.number().nullable(),
  cost_usd: z.number().nullable(),
  created_at: z.string(),
})
export const usageSchema = z.object({ total_usd: z.number(), answers: z.number(), items: z.array(usageItemSchema) })
export type Usage = z.infer<typeof usageSchema>
