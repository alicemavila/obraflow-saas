import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { assertSameTenant, ForbiddenError, NotFoundError, BusinessError } from '@/lib/permissions'
import { logAuditEvent } from '@/lib/audit'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!['SUPER_ADMIN', 'ADMIN_EMPRESA', 'GESTOR_OBRA'].includes(user.role)) {
      throw new ForbiddenError('Sem permissão para aprovar diários')
    }

    const log = await prisma.dailyLog.findUnique({ where: { id: params.id } })
    if (!log) throw new NotFoundError('Diário não encontrado')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, log.companyId)

    if (log.status !== 'SUBMETIDO') {
      throw new BusinessError('Apenas diários submetidos podem ser aprovados', 'DIARY_NOT_SUBMITTED')
    }

    const updated = await prisma.dailyLog.update({
      where: { id: params.id },
      data: { status: 'APROVADO', approvedAt: new Date(), approvedById: user.id },
    })

    await logAuditEvent({
      userId: user.id, companyId: log.companyId,
      action: 'daily_log.approved', entityType: 'DailyLog', entityId: params.id,
      payload: { date: log.date, previousStatus: log.status }, req: _req,
    })

    return ok({ status: updated.status, approvedAt: updated.approvedAt }, 'Diário aprovado com sucesso')
  } catch (err) {
    return handleError(err)
  }
}
