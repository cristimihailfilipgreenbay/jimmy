// Keyed by Student so switching profiles never serves another Student's cache.
export const spacesKey = (studentId: string) => ['spaces', studentId] as const
