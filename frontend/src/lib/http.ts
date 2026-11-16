import { z } from 'zod'
import { getStoredStudentId } from '@/lib/identity'
import { apiErrorSchema } from '@/lib/schemas/apiError'

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const errorMessage = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback)

async function send(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers)
  const studentId = getStoredStudentId()
  if (studentId) headers.set('X-Student-Id', studentId)
  if (init.body) headers.set('Content-Type', 'application/json')
  const res = await fetch(`/api${path}`, { ...init, headers })
  if (!res.ok) {
    const body = apiErrorSchema.safeParse(await res.json().catch(() => null))
    throw new ApiError(
      res.status,
      body.success ? body.data.error.code : 'unknown',
      body.success ? body.data.error.message : `Request failed (${res.status})`,
    )
  }
  return res
}

/** Calls the API and parses the response with the schema, so types come from the schema. */
export async function request<S extends z.ZodType>(path: string, schema: S, init: RequestInit = {}): Promise<z.infer<S>> {
  const res = await send(path, init)
  return schema.parse(await res.json())
}

/** For endpoints that answer 204 with no body. */
export async function requestVoid(path: string, init: RequestInit = {}): Promise<void> {
  await send(path, init)
}
