import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, created, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import {
  ForbiddenError,
  NotFoundError,
  ConflictError,
  assertSameTenant,
  isWorksiteAssociated,
} from '@/lib/permissions'
import { z } from 'zod'
import { UserRole } from '@prisma/client'

const addUserSchema = z.object({
  userId: z.string().uuid(),
  role: z.nativeEnum(UserRole).refine(
    (r) => ['GESTOR_OBRA', 'COLABORADOR', 'CLIENTE_SINDICO'].includes(r),
    'Role inválido para obra'
  ),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()

    const worksite = await prisma.worksite.findUnique({ where: { id: params.id } })
    if (!worksite) throw new NotFoundError('Obra não encontrada')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, worksite.companyId)

    if (!['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)) {
      const associated = await isWorksiteAssociated(user, params.id)
      if (!associated) throw new ForbiddenError()
    }

    const users = await prisma.worksiteUser.findMany({
      where: { worksiteId: params.id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true, isActive: true } },
      },
      orderBy: { assignedAt: 'asc' },
    })

    return ok(users.map((wu) => ({ ...wu.user, worksiteRole: wu.role, assignedAt: wu.assignedAt })))
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser()
    if (!['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(currentUser.role)) throw new ForbiddenError()

    const worksite = await prisma.worksite.findUnique({ where: { id: params.id } })
    if (!worksite) throw new NotFoundError('Obra não encontrada')
    if (currentUser.role !== 'SUPER_ADMIN') assertSameTenant(currentUser, worksite.companyId)

    const body = await req.json()
    const { userId, role } = addUserSchema.parse(body)

    // Verifica que usuário pertence à mesma empresa
    const targetUser = await prisma.user.findFirst({
      where: { id: userId, companyId: worksite.companyId },
    })
    if (!targetUser) throw new NotFoundError('Usuário não encontrado nesta empresa')

    const existing = await prisma.worksiteUser.findUnique({
      where: { worksiteId_userId: { worksiteId: params.id, userId } },
    })
    if (existing) throw new ConflictError('Usuário já associado a esta obra')

    const wu = await prisma.worksiteUser.create({
      data: {
        worksiteId: params.id,
        userId,
        companyId: worksite.companyId,
        role,
        assignedById: currentUser.id,
      },
    })

    return created(wu, 'Usuário adicionado à obra')
  } catch (err) {
    return handleError(err)
  }
}
