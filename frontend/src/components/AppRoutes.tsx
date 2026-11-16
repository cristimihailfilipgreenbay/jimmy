import { Route, Routes } from 'react-router'
import { Layout } from '@/components/Layout'
import { Placeholder } from '@/components/Placeholder'
import { AuthPage } from '@/features/auth/AuthPage'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { SpacesPage } from '@/features/spaces/SpacesPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="sign-in" element={<AuthPage mode="sign-in" />} />
      <Route path="sign-up" element={<AuthPage mode="sign-up" />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<SpacesPage />} />
          <Route path="spaces/:spaceId" element={<Placeholder title="Dashboard" note="Notes, Topics, Weak Topics and Learned Material." />} />
          <Route path="spaces/:spaceId/chat" element={<Placeholder title="Chat" note="Ask the tutor about your Notes." />} />
          <Route path="spaces/:spaceId/study" element={<Placeholder title="Study" note="Quizzes and Tests." />} />
          <Route path="spaces/:spaceId/flashcards" element={<Placeholder title="Flashcards" note="Review your Flashcards." />} />
          <Route path="settings" element={<Placeholder title="Settings" note="Profile and preferences." />} />
          <Route path="developer" element={<Placeholder title="Developer" note="Models, tool toggles, token and cost display." />} />
          <Route path="*" element={<Placeholder title="Not found" note="That page does not exist." />} />
      </Route>
      </Route>
    </Routes>
  )
}
