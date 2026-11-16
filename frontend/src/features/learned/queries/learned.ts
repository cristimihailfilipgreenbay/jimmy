import { z } from 'zod'
import { request, requestVoid } from '@/lib/http'
import { learnedMaterialSchema } from '../schemas/learned'

export const fetchLearnedMaterial = (spaceId: string) =>
  request(`/spaces/${spaceId}/learned-material`, z.array(learnedMaterialSchema))

export const approveLearnedMaterial = (spaceId: string, id: string) =>
  request(`/spaces/${spaceId}/learned-material/${id}/approve`, learnedMaterialSchema, { method: 'POST' })

export const deleteLearnedMaterial = (spaceId: string, id: string) =>
  requestVoid(`/spaces/${spaceId}/learned-material/${id}`, { method: 'DELETE' })
