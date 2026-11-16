import { AppRoutes } from '@/components/AppRoutes'
import { Providers } from '@/components/Providers'

export default function App() {
  return (
    <Providers>
      <AppRoutes />
    </Providers>
  )
}
