import { z } from 'zod'
import { WeatherCondition, WorkShift, OccurrenceType, OccurrenceSeverity } from '@prisma/client'

export const createDailyLogSchema = z
  .object({
    date: z.string().date('Data inválida (formato: YYYY-MM-DD)'),
    weatherMorning: z.nativeEnum(WeatherCondition).optional(),
    weatherAfternoon: z.nativeEnum(WeatherCondition).optional(),
    weatherEvening: z.nativeEnum(WeatherCondition).optional(),
    tempMin: z.number().min(-20).max(60).optional(),
    tempMax: z.number().min(-20).max(60).optional(),
    workedHours: z.number().min(0).max(24).optional(),
    notes: z.string().max(5000).optional(),
  })
  .refine(
    (data) => {
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      return new Date(data.date) <= today
    },
    { message: 'Data futura não é permitida', path: ['date'] }
  )
  .refine(
    (data) => {
      if (data.tempMin == null || data.tempMax == null) return true
      return data.tempMin <= data.tempMax
    },
    { message: 'Temperatura mínima não pode ser maior que a máxima', path: ['tempMax'] }
  )

export const updateDailyLogSchema = createDailyLogSchema.partial().omit({ date: true })

export const rejectDailyLogSchema = z.object({
  reason: z.string().min(10, 'Informe o motivo da rejeição (mínimo 10 caracteres)').max(1000),
})

export const createActivitySchema = z.object({
  description: z.string().min(3, 'Descrição obrigatória').max(2000),
  location: z.string().max(255).optional(),
  progress: z.number().min(0).max(100).optional(),
  unit: z.string().max(50).optional(),
  quantity: z.number().positive().optional(),
  notes: z.string().max(2000).optional(),
  order: z.number().int().min(0).optional(),
})

export const createLaborSchema = z.object({
  role: z.string().min(2, 'Função obrigatória').max(100),
  quantity: z.number().int().positive('Quantidade deve ser positiva').max(9999),
  shift: z.nativeEnum(WorkShift),
  contractor: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
})

export const createMaterialSchema = z.object({
  name: z.string().min(2, 'Nome do material obrigatório').max(255),
  quantity: z.number().positive('Quantidade deve ser positiva'),
  unit: z.string().min(1, 'Unidade obrigatória').max(20),
  notes: z.string().max(1000).optional(),
})

export const createOccurrenceSchema = z.object({
  type: z.nativeEnum(OccurrenceType),
  severity: z.nativeEnum(OccurrenceSeverity),
  description: z.string().min(5, 'Descrição da ocorrência obrigatória').max(5000),
  actionTaken: z.string().max(5000).optional(),
})

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comentário não pode ser vazio').max(5000),
})

export type CreateDailyLogInput = z.infer<typeof createDailyLogSchema>
export type UpdateDailyLogInput = z.infer<typeof updateDailyLogSchema>
export type CreateActivityInput = z.infer<typeof createActivitySchema>
export type CreateLaborInput = z.infer<typeof createLaborSchema>
export type CreateMaterialInput = z.infer<typeof createMaterialSchema>
export type CreateOccurrenceInput = z.infer<typeof createOccurrenceSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
