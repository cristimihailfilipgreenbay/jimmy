import { request } from '@/lib/http'
import { modelsSchema, settingsSchema, usageSchema, type SettingsChange } from '../schemas/developer'

export const fetchSettings = () => request('/settings', settingsSchema)
export const updateSettings = (changes: SettingsChange) => request('/settings', settingsSchema, { method: 'PUT', body: JSON.stringify(changes) })
export const fetchModels = () => request('/settings/models', modelsSchema)
export const fetchUsage = () => request('/usage', usageSchema)
