import { request } from '@/lib/http'
import { onboardingResponseSchema, type OnboardingRequest } from '../schemas/onboarding'

export const completeOnboarding = (body: OnboardingRequest) =>
  request('/onboarding', onboardingResponseSchema, { method: 'POST', body: JSON.stringify(body) })
