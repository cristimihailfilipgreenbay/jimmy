import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSignedInStudent } from '../hooks/useSignedInStudent'
import { useSignOut } from '../queries/useSignOut'

export function UserMenu() {
  const student = useSignedInStudent()
  const signOut = useSignOut()
  const name = student.display_name ?? student.email
  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="grid size-8 flex-none place-items-center rounded-full bg-primary text-xs font-medium text-primary-foreground" aria-hidden>
          {name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{name}</p>
          {student.display_name && <p className="truncate text-xs text-muted-foreground">{student.email}</p>}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={() => signOut.mutate()} disabled={signOut.isPending}>
        <LogOut /> Sign out
      </Button>
    </div>
  )
}
