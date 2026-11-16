const STUDENT_KEY = 'jimmy.studentId'

// The Student chosen in the profile switcher. Sent as X-Student-Id on every request.
export function getStoredStudentId(): string | null {
  try {
    return localStorage.getItem(STUDENT_KEY)
  } catch {
    return null
  }
}

export function storeStudentId(id: string | null) {
  try {
    if (id) localStorage.setItem(STUDENT_KEY, id)
    else localStorage.removeItem(STUDENT_KEY)
  } catch {
    // Private mode: the profile just is not remembered.
  }
}
