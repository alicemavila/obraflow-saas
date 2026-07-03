import { z } from 'zod'
import { WorksiteStatus, WorksiteRegistrationMode } from '@prisma/client'

// ─── Campos base ──────────────────────────────────────────────────────────────

const nameSchema = z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(255)

const statusSchema = z.nativeEnum(WorksiteStatus, { required_error: 'Status é obrigatório' })

// groupId obrigatório no formulário (UUID válido)
const groupIdRequiredSchema = z.string().uuid('Selecione um grupo válido')

const optionalAddress = {
  cep: z.string().regex(/^\d{5}-\d{3}$/, 'CEP inválido (ex: 01310-100)').optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  neighborhood: z.string().max(255).optional(),
  city: z.string().max(255).optional(),
  state: z.string().length(2, 'Estado deve ter 2 caracteres (ex: SP)').optional().or(z.literal('')),
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

// ─── A) Cadastro Simples ──────────────────────────────────────────────────────
// Obrigatórios: name, status, groupId
// Opcionais: hasTaskList

export const createSimpleWorksiteSchema = z.object({
  name: nameSchema,
  status: statusSchema,
  groupId: groupIdRequiredSchema,
  hasTaskList: z.boolean().optional().default(false),
  registrationMode: z.literal(WorksiteRegistrationMode.SIMPLE).default(WorksiteRegistrationMode.SIMPLE),
})

// ─── B) Cadastro Completo ─────────────────────────────────────────────────────
// Obrigatórios: name, status, groupId, responsibleName, startDate, endDateForecast

export const createCompleteWorksiteSchema = z
  .object({
    name: nameSchema,
    status: statusSchema,
    groupId: groupIdRequiredSchema,
    responsibleName: z.string().min(2, 'Responsável técnico obrigatório').max(255),
    startDate: z.string({ required_error: 'Data de início obrigatória' }).min(1, 'Data de início obrigatória'),
    endDateForecast: z.string({ required_error: 'Previsão de término obrigatória' }).min(1, 'Previsão de término obrigatória'),
    hasTaskList: z.boolean().optional().default(false),
    registrationMode: z.literal(WorksiteRegistrationMode.COMPLETE).default(WorksiteRegistrationMode.COMPLETE),
    ...optionalAddress,
    ...optionalTechnical,
  })
  .refine(
    (d) => new Date(d.startDate) <= new Date(d.endDateForecast),
    { message: 'Previsão de término não pode ser anterior à data de início', path: ['endDateForecast'] }
  )

// ─── Schema unificado para API ────────────────────────────────────────────────
// Aceita ambos os modos; validações condicionais por registrationMode.

export const createWorksiteSchema = z
  .object({
    name: nameSchema,
    status: statusSchema,
    groupId: groupIdRequiredSchema,
    registrationMode: z.nativeEnum(WorksiteRegistrationMode).default(WorksiteRegistrationMode.SIMPLE),
    responsibleName: z.string().max(255).optional(),
    startDate: z.string().optional(),
    endDateForecast: z.string().optional(),
    hasTaskList: z.boolean().optional().default(false),
    ...optionalAddress,
    ...optionalTechnical,
  })
  .refine(
    (d) => {
      if (!d.endDateForecast || !d.startDate) return true
      return new Date(d.startDate) <= new Date(d.endDateForecast)
    },
    { message: 'Previsão de término não pode ser anterior à data de início', path: ['endDateForecast'] }
  )
  .refine(
    (d) => {
      if (d.registrationMode !== WorksiteRegistrationMode.COMPLETE) return true
      return !!d.responsibleName?.trim() && !!d.startDate && !!d.endDateForecast
    },
    { message: 'Cadastro completo requer responsável, data de início e previsão de término', path: ['responsibleName'] }
  )

// ─── Schema de atualização ────────────────────────────────────────────────────

export const updateWorksiteSchema = z
  .object({
    name: nameSchema.optional(),
    status: statusSchema.optional(),
    groupId: z.string().uuid('Grupo inválido').optional(),
    registrationMode: z.nativeEnum(WorksiteRegistrationMode).optional(),
    responsibleName: z.string().max(255).optional(),
    startDate: z.string().optional(),
    endDateForecast: z.string().optional(),
    hasTaskList: z.boolean().optional(),
    ...optionalAddress,
    ...optionalTechnical,
  })
  .refine(
    (d) => {
      if (!d.endDateForecast || !d.startDate) return true
      return new Date(d.startDate) <= new Date(d.endDateForecast)
    },
    { message: 'Previsão de término não pode ser anterior à data de início', path: ['endDateForecast'] }
  )

export const updateWorksiteStatusSchema = z.object({ status: z.nativeEnum(WorksiteStatus) })

// ─── calculateWorksiteProfileCompletion ──────────────────────────────────────
// SIMPLE → sempre false
// COMPLETE → true apenas quando name + status + groupId + responsibleName + startDate + endDateForecast

export function calculateWorksiteProfileCompletion(data: {
  name?: string | null
  status?: WorksiteStatus | null
  groupId?: string | null
  responsibleName?: string | null
  startDate?: Date | string | null
  endDateForecast?: Date | string | null
  registrationMode?: WorksiteRegistrationMode | null
}): boolean {
  if (data.registrationMode !== WorksiteRegistrationMode.COMPLETE) return false
  return Boolean(
    data.name?.trim() &&
    data.status &&
    data.groupId?.trim() &&
    data.responsibleName?.trim() &&
    data.startDate &&
    data.endDateForecast
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateSimpleWorksiteInput = z.infer<typeof createSimpleWorksiteSchema>
export type CreateCompleteWorksiteInput = z.infer<typeof createCompleteWorksiteSchema>
export type CreateWorksiteInput = z.infer<typeof createWorksiteSchema>
export type UpdateWorksiteInput = z.infer<typeof updateWorksiteSchema>
