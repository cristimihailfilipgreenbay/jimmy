import type { LucideIcon } from 'lucide-react'

export type ToastItem = { id: number; message: string; icon?: LucideIcon }

let items: ToastItem[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Show a short confirmation in the corner, as the design does. */
export function toast(message: string, icon?: LucideIcon) {
  items = [...items, { id: nextId++, message, icon }]
  emit()
}

export function dismissToast(id: number) {
  items = items.filter((t) => t.id !== id)
  emit()
}

export const subscribeToasts = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export const getToasts = () => items
