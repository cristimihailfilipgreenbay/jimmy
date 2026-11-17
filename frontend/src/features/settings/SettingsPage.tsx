import { ChevronRight, Code, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { Switch } from '@/components/ui/switch'
import { useSignedInStudent } from '@/features/auth/hooks/useSignedInStudent'
import { cardClass } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { AnswerStyleSection } from './components/AnswerStyleSection'
import { MemorySection } from './components/MemorySection'
import { ProfileSection } from './components/ProfileSection'
import { SourcesSection } from './components/SourcesSection'
import { useProfile, useUpdateProfile } from './queries/useProfile'

// What the Student can change about how Jimmy works.
export function SettingsPage() {
  const student = useSignedInStudent()
  const { data: profile } = useProfile(student.id)
  const update = useUpdateProfile(student.id)
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-8 pb-28">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">How Jimmy looks and what it remembers about you.</p>
      <ProfileSection studentId={student.id} />
      <section className={cn(cardClass, 'mt-4 px-5')} aria-labelledby="s-study">
        <h2 id="s-study" className="pt-5 font-semibold">
          Study
        </h2>
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between gap-6 py-4">
            <div>
              <p className="text-sm font-medium" id="r-adaptive">
                Adaptive difficulty
              </p>
              <p className="text-sm text-muted-foreground">
                Quizzes and tests get harder after two right answers in a row and easier after a wrong one. Jimmy writes each question after your last answer, so there is a short wait. Off writes every question up front, so answering is instant.
              </p>
            </div>
            <Switch checked={profile?.adaptive_difficulty ?? false} disabled={!profile} onCheckedChange={(adaptive_difficulty) => update.mutate({ adaptive_difficulty })} aria-labelledby="r-adaptive" />
          </div>
        </div>
        {update.isError && (
          <p role="alert" className="flex items-start gap-2 pb-4 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 flex-none" aria-hidden />
            Jimmy could not save that. Try again.
          </p>
        )}
      </section>
      <AnswerStyleSection studentId={student.id} />
      <SourcesSection studentId={student.id} />
      <MemorySection studentId={student.id} />
      <Link to="/developer" className={cn(cardClass, 'mt-4 flex items-center gap-3 p-4 transition-colors hover:bg-muted/40')}>
        <span className="grid size-9 place-items-center rounded-md bg-muted">
          <Code className="size-4" aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-medium">Developer settings</span>
          <span className="block text-sm text-muted-foreground">Model, temperature, tools and cost. Kept separate on purpose.</span>
        </span>
        <ChevronRight className="size-4" aria-hidden />
      </Link>
    </main>
  )
}
