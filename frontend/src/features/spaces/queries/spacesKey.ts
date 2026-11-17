// Keyed by Student so switching profiles never serves another Student's cache.
export const spacesKey = (studentId: string) => ['spaces', studentId] as const
/** One Space. It sits under `spacesKey`, so invalidating the list refreshes it too. */
export const spaceKey = (studentId: string, spaceId: string) => ['spaces', studentId, spaceId] as const
