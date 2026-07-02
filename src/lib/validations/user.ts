import { z } from 'zod'
import { UserRole } from '@prisma/client'

export const inviteUserSchema = z.object({
  email: z.string().email('E-mail inválido').toLowerCase(),
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(255),
  role: z.nativeEnum(UserRole).refine(
    (r) => r !== UserRole.SUPER_ADMIN,
    'Não é possível convidar SUPER_ADMIN'
  ),
})

export const updateUserSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  phone: z
    .string()
    .regex(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/, 'Telefone inválido')
    .optional()
    .or(z.literal('')),
})

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(UserRole).refine(
    (r) => r !== UserRole.SUPER_ADMIN,
    'Não é possível atribuir papel SUPER_ADMIN'
  ),
})

export const acceptInviteSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, 'Senha deve ter no mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Senha deve conter ao menos uma letra maiúscula')
      .regex(/[0-9]/, 'Senha deve conter ao menos um número'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  })

export type InviteUserInput = z.infer<typeof inviteUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>
