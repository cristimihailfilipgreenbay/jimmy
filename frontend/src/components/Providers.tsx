import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'
import { StudentProvider } from '@/features/students/state/StudentProvider'

// No retries: the failures here (401, 404, 409) will not fix themselves.
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } })

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <StudentProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </StudentProvider>
    </QueryClientProvider>
  )
}
