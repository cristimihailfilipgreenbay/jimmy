const LABELS = ['Too short', 'Weak', 'Okay', 'Good', 'Strong']

/** `level` is 0 to 4 and drives the meter; `tip` says what would improve it. */
export function passwordStrength(pw: string) {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d|[^A-Za-z0-9]/.test(pw)) score++
  const tooShort = pw.length < 8
  const level = tooShort ? (pw ? 1 : 0) : score
  const label = !pw ? 'Use at least 8 characters.' : LABELS[tooShort ? 0 : score]
  const tip = !pw
    ? ''
    : tooShort
      ? `${8 - pw.length} more character${8 - pw.length > 1 ? 's' : ''}`
      : level < 3
        ? 'add a number, symbol or capital letter'
        : ''
  return { level, label, tip, started: pw.length > 0 }
}
