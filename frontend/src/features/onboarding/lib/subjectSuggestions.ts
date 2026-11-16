// Suggested subjects, depending on what the Student typed as their course.
export function subjectSuggestions(course: string): string[] {
  const c = course.toLowerCase()
  if (/bio|med|life/.test(c))
    return ['Cell Biology', 'Genetics', 'Biochemistry', 'Ecology', 'Physiology', 'Organic Chemistry', 'Statistics']
  if (/phys|eng/.test(c))
    return ['Thermodynamics', 'Mechanics', 'Electromagnetism', 'Quantum Physics', 'Linear Algebra', 'Calculus']
  if (/chem/.test(c))
    return ['Organic Chemistry', 'Physical Chemistry', 'Inorganic Chemistry', 'Analytical Chemistry', 'Biochemistry']
  if (/hist|art|lit/.test(c))
    return ['Modern History', 'Medieval History', 'Historiography', 'Political Theory', 'Art History']
  if (/econ|business/.test(c))
    return ['Microeconomics', 'Macroeconomics', 'Statistics', 'Accounting', 'Econometrics']
  return ['Biology', 'Chemistry', 'Physics', 'Mathematics', 'Statistics', 'History', 'Economics', 'Psychology']
}
