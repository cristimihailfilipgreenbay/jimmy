import { useState, type FormEvent } from 'react'
import { errorMessage } from '@/lib/http'
import { useStudent } from '../hooks/useStudent'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ProfileSwitcher() {
  const { students, current, select, create } = useStudent()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await create(name)
      setName('')
      setAdding(false)
    } catch (err) {
      setError(errorMessage(err, 'Could not create the profile.'))
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-2">
      <label htmlFor="profile" className="text-xs text-muted-foreground">
        Profile
      </label>
      <select
        id="profile"
        className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
        value={current?.id ?? ''}
        onChange={(e) => select(e.target.value)}
      >
        {!current && <option value="">Choose a profile…</option>}
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.display_name}
          </option>
        ))}
      </select>
      {adding ? (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <Input
            autoFocus
            aria-label="New profile name"
            placeholder="Name"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!name.trim()}>
              Add
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          New profile
        </Button>
      )}
    </div>
  )
}
