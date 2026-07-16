import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { ForbiddenError, NotFoundError, assertSameTenant } from '@/lib/permissions'
import { updateUserSchema } from '@/lib/validations/user'
import { logAuditEvent } from '@/lib/audit'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser()

    // Usuário pode ver a si mesmo; admin vê qualquer um da empresa
    if (user.id !== params.id && !['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)) {
      throw new ForbiddenError()
    }

    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        companyId: true,
        company: { select: { id: true, name: true, slug: true } },
      },
    })

    if (!target) throw new NotFoundError('Usuário não encontrado')

    // Verifica tenant
    if (target.companyId && user.role !== 'SUPER_ADMIN') {
      assertSameTenant(user, target.companyId)
    }

    return ok(target)
  } catch (err) {
    return handleError(err)
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const currentUser = await getCurrentUser()

    if (currentUser.id !== params.id && !['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(currentUser.role)) {
      throw new ForbiddenError()
    }

    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, companyId: true },
    })
    if (!target) throw new NotFoundError('Usuário não encontrado')
    if (target.companyId && currentUser.role !== 'SUPER_ADMIN') {
      assertSameTenant(currentUser, target.companyId)
    }

    const body = await req.json()
    const data = updateUserSchema.parse(body)

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true, email: true, phone: true, role: true, updatedAt: true },
    })

    await logAuditEvent({
      userId: currentUser.id,
      companyId: currentUser.companyId,
      action: 'user.updated',
      entityType: 'User',
      entityId: params.id,
      payload: data,
      req,
    })

    return ok(updated, 'Usuário atualizado com sucesso')
  } catch (err) {
    return handleError(err)
  }
}
