import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { ForbiddenError, NotFoundError, assertSameTenant } from '@/lib/permissions'
import { updateWorksiteStatusSchema } from '@/lib/validations/worksite'
import { logAuditEvent } from '@/lib/audit'

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser()
    if (!['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)) throw new ForbiddenError()

    const worksite = await prisma.worksite.findUnique({ where: { id: params.id } })
    if (!worksite) throw new NotFoundError('Obra não encontrada')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, worksite.companyId)

    const body = await req.json()
    const { status } = updateWorksiteStatusSchema.parse(body)

    const updated = await prisma.worksite.update({
      where: { id: params.id },
      data: {
        status,
        ...(status === 'CONCLUIDA' && { endDateActual: new Date() }),
      },
    })

    await logAuditEvent({
      userId: user.id,
      companyId: worksite.companyId,
      action: 'worksite.status_changed',
      entityType: 'Worksite',
      entityId: params.id,
      payload: { from: worksite.status, to: status },
      req,
    })

    return ok(updated, 'Status da obra atualizado')
  } catch (err) {
    return handleError(err)
  }
}
