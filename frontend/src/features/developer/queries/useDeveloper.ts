import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchModels, fetchSettings, fetchUsage, updateSettings } from './developer'
import type { DeveloperSettings, SettingsChange } from '../schemas/developer'

export const settingsKey = (studentId: string) => ['settings', studentId] as const
export const usageKey = (studentId: string) => ['usage', studentId] as const

export const useDeveloperSettings = (studentId: string) => useQuery({ queryKey: settingsKey(studentId), queryFn: fetchSettings })

/** The models OpenRouter offers. Not needed until the Developer page is open, and it can fail on its own. */
export const useModels = () => useQuery({ queryKey: ['models'], queryFn: fetchModels, staleTime: 60 * 60 * 1000, retry: false })

export const useUsage = (studentId: string) => useQuery({ queryKey: usageKey(studentId), queryFn: fetchUsage })

function applyChange(old: DeveloperSettings, { tools, ...rest }: SettingsChange): DeveloperSettings {
  return { ...old, ...rest, tools: old.tools.map((t) => (tools && t.name in tools ? { ...t, enabled: tools[t.name] } : t)) }
}

/** Saves a change at once and shows it before the answer comes back; a failure puts it back. */
export function useUpdateSettings(studentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateSettings,
    onMutate: async (changes: SettingsChange) => {
      await qc.cancelQueries({ queryKey: settingsKey(studentId) })
      const before = qc.getQueryData<DeveloperSettings>(settingsKey(studentId))
      qc.setQueryData<DeveloperSettings>(settingsKey(studentId), (old) => (old ? applyChange(old, changes) : old))
      return { before }
    },
    onError: (_err, _changes, context) => qc.setQueryData(settingsKey(studentId), context?.before),
    onSettled: () => qc.invalidateQueries({ queryKey: settingsKey(studentId) }),
  })
}
