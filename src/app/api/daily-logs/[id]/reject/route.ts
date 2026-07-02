import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { assertSameTenant, ForbiddenError, NotFoundError, BusinessError } from '@/lib/permissions'
import { rejectDailyLogSchema } from '@/lib/validations/daily-log'
import { logAuditEvent } from '@/lib/audit'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!['SUPER_ADMIN', 'ADMIN_EMPRESA', 'GESTOR_OBRA'].includes(user.role)) {
      throw new ForbiddenError()
    }

    const log = await prisma.dailyLog.findUnique({ where: { id: params.id } })
    if (!log) throw new NotFoundError('Diário não encontrado')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, log.companyId)

    if (log.status !== 'SUBMETIDO') {
      throw new BusinessError('Apenas diários submetidos podem ser rejeitados', 'INVALID_STATUS')
    }

    const body = await req.json()
    const { reason } = rejectDailyLogSchema.parse(body)

    const updated = await prisma.dailyLog.update({
      where: { id: params.id },
      data: {
        status: 'REJEITADO',
        rejectedAt: new Date(),
        rejectedById: user.id,
        rejectionReason: reason,
      },
    })

    await logAuditEvent({
      userId: user.id, companyId: log.companyId,
      action: 'daily_log.rejected', entityType: 'DailyLog', entityId: params.id,
      payload: { reason }, req,
    })

    return ok({ status: updated.status, rejectionReason: reason }, 'Diário rejeitado')
  } catch (err) {
    return handleError(err)
  }
}
