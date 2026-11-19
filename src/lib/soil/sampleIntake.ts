import { z } from 'zod'

export const SOIL_SAMPLED_BY_VALUES = ['client', 'lab'] as const

export type SoilSampledBy = (typeof SOIL_SAMPLED_BY_VALUES)[number]

export const SOIL_SAMPLED_BY_LABELS: Record<SoilSampledBy, string> = {
  client: 'Cliente',
  lab: 'Laboratorio',
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function todayIsoDate(): string {
  const now = new Date()
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}

export function isSoilSampledBy(value: unknown): value is SoilSampledBy {
  return value === 'client' || value === 'lab'
}

export function soilSampledByLabel(value: string | null | undefined): string {
  if (isSoilSampledBy(value)) return SOIL_SAMPLED_BY_LABELS[value]
  return '—'
}

export const createSoilSampleSchema = z.object({
  client_id: z.string().uuid('El cliente no es válido'),
  code: z
    .string()
    .trim()
    .regex(/^\d+$/, 'El código de muestra debe ser numérico, igual que la columna A del Excel'),
  received_at: z.string().regex(ISO_DATE, 'La fecha de recepción no es válida'),
  sampled_at: z.string().regex(ISO_DATE, 'La fecha de toma de muestra no es válida'),
  sampled_by: z.enum(SOIL_SAMPLED_BY_VALUES, 'Indica si muestreó el cliente o el laboratorio'),
  notes: z.string().trim().max(2000).optional(),
})

export type CreateSoilSampleInput = z.infer<typeof createSoilSampleSchema>

export function readIsoDate(value: unknown): string | null {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return null
  return value
}
