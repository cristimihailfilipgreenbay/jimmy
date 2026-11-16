const KNOWN_KEY = 'jimmy.knownStudentIds'

// Profiles this browser has created or used. The backend only lists these.
export function getKnownStudentIds(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KNOWN_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function rememberStudentId(id: string) {
  try {
    const ids = getKnownStudentIds()
    if (!ids.includes(id)) localStorage.setItem(KNOWN_KEY, JSON.stringify([...ids, id]))
  } catch {
    // Private mode: the profile just is not remembered.
  }
}

export function forgetStudentIds(gone: string[]) {
  try {
    localStorage.setItem(KNOWN_KEY, JSON.stringify(getKnownStudentIds().filter((id) => !gone.includes(id))))
  } catch {
    // ignore
  }
}
