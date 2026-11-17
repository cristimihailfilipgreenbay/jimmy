import { Route, Routes } from 'react-router'
import { Layout } from '@/components/Layout'
import { Placeholder } from '@/components/Placeholder'
import { AuthPage } from '@/features/auth/AuthPage'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { ChatPage } from '@/features/chat/ChatPage'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { RequireOnboarded } from '@/features/onboarding/components/RequireOnboarded'
import { DeveloperPage } from '@/features/developer/DeveloperPage'
import { FlashcardsPage } from '@/features/flashcards/FlashcardsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { StudyPage } from '@/features/study/StudyPage'
import { SpaceDashboardPage } from '@/features/spaces/SpaceDashboardPage'
import { SpacesPage } from '@/features/spaces/SpacesPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthPage />}>
        <Route path="sign-in" element={null} />
        <Route path="sign-up" element={null} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route path="welcome" element={<OnboardingPage />} />
        <Route element={<RequireOnboarded />}>
          <Route element={<Layout />}>
            <Route index element={<SpacesPage />} />
            <Route path="spaces/:spaceId" element={<SpaceDashboardPage />} />
            <Route path="spaces/:spaceId/chat" element={<ChatPage />} />
            <Route path="spaces/:spaceId/study" element={<StudyPage />} />
            <Route path="spaces/:spaceId/flashcards" element={<FlashcardsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="developer" element={<DeveloperPage />} />
            <Route path="*" element={<Placeholder title="Not found" note="That page does not exist." />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
