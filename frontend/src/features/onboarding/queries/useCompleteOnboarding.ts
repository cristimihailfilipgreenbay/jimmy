import { useMutation } from '@tanstack/react-query'
import { completeOnboarding } from './onboarding'

// The signed-in Student in the cache is updated when they leave the finish
// screen, not here: updating it now would send them away from that screen.
export const useCompleteOnboarding = () => useMutation({ mutationFn: completeOnboarding })
