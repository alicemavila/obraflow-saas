import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { ForbiddenError, NotFoundError, BusinessError, assertSameTenant } from '@/lib/permissions'
import { logAuditEvent } from '@/lib/audit'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser()
    if (!['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(currentUser.role)) {
      throw new ForbiddenError()
    }

    if (currentUser.id === params.id) {
      throw new BusinessError('Você não pode desativar sua própria conta', 'SELF_DEACTIVATION')
    }

    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, companyId: true, role: true, isActive: true },
    })
    if (!target) throw new NotFoundError('Usuário não encontrado')
    if (target.companyId && currentUser.role !== 'SUPER_ADMIN') {
      assertSameTenant(currentUser, target.companyId)
    }
    if (target.role === 'SUPER_ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError()
    }

    await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    await logAuditEvent({
      userId: currentUser.id,
      companyId: currentUser.companyId,
      action: 'user.deactivated',
      entityType: 'User',
      entityId: params.id,
      req,
    })

    return ok(null, 'Usuário desativado com sucesso')
  } catch (err) {
    return handleError(err)
  }
}
