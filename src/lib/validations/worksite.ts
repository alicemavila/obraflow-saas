import { z } from 'zod'
import { WorksiteStatus, WorksiteRegistrationMode } from '@prisma/client'

// ─── Campos compartilhados ────────────────────────────────────────────────────

const nameSchema = z
  .string()
  .min(2, 'Nome deve ter ao menos 2 caracteres')
  .max(255)

const statusSchema = z.nativeEnum(WorksiteStatus, {
  required_error: 'Status é obrigatório',
})

const optionalAddress = {
  cep: z
    .string()
    .regex(/^\d{5}-\d{3}$/, 'CEP inválido (ex: 01310-100)')
    .optional()
    .or(z.literal('')),
  address: z.string().max(500).optional(),
  neighborhood: z.string().max(255).optional(),
  city: z.string().max(255).optional(),
  state: z
    .string()
    .length(2, 'Estado deve ter 2 caracteres (ex: SP)')
    .optional()
    .or(z.literal('')),
}

const optionalTechnical = {
  artNumber: z.string().max(50).optional(),
  responsibleCrea: z.string().max(50).optional(),
  totalArea: z.number().positive('Área deve ser positiva').optional(),
  description: z.string().optional(),
  contractType: z.string().max(100).optional(),
  clientName: z.string().max(255).optional(),
  contractNumber: z.string().max(100).optional(),
}

const commonOptional = {
  groupId: z.string().uuid('Grupo inválido').optional(),
  hasTaskList: z.boolean().optional().default(false),
}

// ─── Cadastro Simples ─────────────────────────────────────────────────────────

export const createSimpleWorksiteSchema = z.object({
  name: nameSchema,
  status: statusSchema,
  registrationMode: z.literal(WorksiteRegistrationMode.SIMPLE).default(WorksiteRegistrationMode.SIMPLE),
  ...commonOptional,
})

// ─── Cadastro Completo ────────────────────────────────────────────────────────

export const createCompleteWorksiteSchema = z
  .object({
    name: nameSchema,
    status: statusSchema,
    registrationMode: z.literal(WorksiteRegistrationMode.COMPLETE).default(WorksiteRegistrationMode.COMPLETE),
    responsibleName: z
      .string()
      .min(2, 'Responsável técnico obrigatório')
      .max(255),
    startDate: z
      .string({ required_error: 'Data de início obrigatória' })
      .min(1, 'Data de início obrigatória'),
    endDateForecast: z.string().optional(),
    ...optionalAddress,
    ...optionalTechnical,
    ...commonOptional,
  })
  .refine(
    (data) => {
      if (!data.endDateForecast || !data.startDate) return true
      return new Date(data.startDate) <= new Date(data.endDateForecast)
    },
    {
      message: 'Previsão de término não pode ser anterior à data de início',
      path: ['endDateForecast'],
    }
  )

// ─── Schema unificado para API (aceita ambos os modos) ────────────────────────

export const createWorksiteSchema = z
  .object({
    name: nameSchema,
    status: statusSchema,
    registrationMode: z
      .nativeEnum(WorksiteRegistrationMode)
      .default(WorksiteRegistrationMode.SIMPLE),
    // Técnico — opcional no modo simples
    responsibleName: z.string().max(255).optional(),
    startDate: z.string().optional(),
    endDateForecast: z.string().optional(),
    // Endereço — sempre opcional
    ...optionalAddress,
    ...optionalTechnical,
    ...commonOptional,
  })
  .refine(
    (data) => {
      if (!data.endDateForecast || !data.startDate) return true
      return new Date(data.startDate) <= new Date(data.endDateForecast)
    },
    {
      message: 'Previsão de término não pode ser anterior à data de início',
      path: ['endDateForecast'],
    }
  )
  .refine(
    (data) => {
      // Se cadastro completo, responsável e data de início são obrigatórios
      if (data.registrationMode === WorksiteRegistrationMode.COMPLETE) {
        return !!data.responsibleName && !!data.startDate
      }
      return true
    },
    {
      message: 'Cadastro completo requer responsável técnico e data de início',
      path: ['responsibleName'],
    }
  )

export const updateWorksiteSchema = z
  .object({
    name: nameSchema.optional(),
    status: statusSchema.optional(),
    registrationMode: z.nativeEnum(WorksiteRegistrationMode).optional(),
    responsibleName: z.string().max(255).optional(),
    startDate: z.string().optional(),
    endDateForecast: z.string().optional(),
    ...optionalAddress,
    ...optionalTechnical,
    ...commonOptional,
  })
  .refine(
    (data) => {
      if (!data.endDateForecast || !data.startDate) return true
      return new Date(data.startDate) <= new Date(data.endDateForecast)
    },
    {
      message: 'Previsão de término não pode ser anterior à data de início',
      path: ['endDateForecast'],
    }
  )

export const updateWorksiteStatusSchema = z.object({
  status: z.nativeEnum(WorksiteStatus),
})

// ─── Helper: calcula se o cadastro está completo ──────────────────────────────

export function calculateWorksiteProfileCompletion(data: {
  name?: string | null
  status?: WorksiteStatus | null
  responsibleName?: string | null
  startDate?: Date | string | null
  registrationMode?: WorksiteRegistrationMode | null
}): boolean {
  if (data.registrationMode === WorksiteRegistrationMode.SIMPLE) return false
  return Boolean(
    data.name?.trim() &&
    data.status &&
    data.responsibleName?.trim() &&
    data.startDate
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateSimpleWorksiteInput = z.infer<typeof createSimpleWorksiteSchema>
export type CreateCompleteWorksiteInput = z.infer<typeof createCompleteWorksiteSchema>
export type CreateWorksiteInput = z.infer<typeof createWorksiteSchema>
export type UpdateWorksiteInput = z.infer<typeof updateWorksiteSchema>
