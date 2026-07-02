import { z } from 'zod'
import { WorksiteStatus } from '@prisma/client'

export const createWorksiteSchema = z
  .object({
    name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(255),
    address: z.string().min(5, 'Endereço obrigatório').max(500),
    neighborhood: z.string().max(255).optional(),
    city: z.string().min(2, 'Cidade obrigatória').max(255),
    state: z.string().length(2, 'Estado deve ter 2 caracteres (ex: SP)'),
    cep: z.string().regex(/^\d{5}-\d{3}$/, 'CEP inválido (ex: 01310-100)'),
    artNumber: z.string().max(50).optional(),
    responsibleName: z.string().min(2, 'Responsável técnico obrigatório').max(255),
    responsibleCrea: z.string().max(50).optional(),
    startDate: z.string().datetime({ offset: true }).or(z.string().date()),
    endDateForecast: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    description: z.string().optional(),
    clientName: z.string().max(255).optional(),
    contractNumber: z.string().max(100).optional(),
    totalArea: z.number().positive().optional(),
  })
  .refine(
    (data) => {
      if (!data.endDateForecast) return true
      return new Date(data.startDate) <= new Date(data.endDateForecast)
    },
    {
      message: 'Data de início não pode ser posterior à previsão de conclusão',
      path: ['endDateForecast'],
    }
  )

export const updateWorksiteSchema = createWorksiteSchema.partial()

export const updateWorksiteStatusSchema = z.object({
  status: z.nativeEnum(WorksiteStatus),
})

export type CreateWorksiteInput = z.infer<typeof createWorksiteSchema>
export type UpdateWorksiteInput = z.infer<typeof updateWorksiteSchema>
