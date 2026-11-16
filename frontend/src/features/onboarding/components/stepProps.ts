import type { OnboardingForm } from '../lib/form'

export type StepProps = {
  form: OnboardingForm
  update: (changes: Partial<OnboardingForm>) => void
  /** Pressing Enter in a text field moves to the next step. */
  onSubmit: () => void
}
