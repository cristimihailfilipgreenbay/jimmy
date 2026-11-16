/**
 * A Study Space's course is one line, "code · lecturer", as in the design. The
 * dialogs edit the two parts separately.
 */
export const courseLine = (code: string, lecturer: string) =>
  [code, lecturer]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' · ')

export function splitCourse(course: string | null): [string, string] {
  if (!course) return ['', '']
  const at = course.indexOf(' · ')
  return at < 0 ? [course, ''] : [course.slice(0, at), course.slice(at + 3)]
}
