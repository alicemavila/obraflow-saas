import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import {
  assertSameTenant,
  isWorksiteAssociated,
  ForbiddenError,
  NotFoundError,
  BusinessError,
} from '@/lib/permissions'
import { logAuditEvent } from '@/lib/audit'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!['SUPER_ADMIN', 'ADMIN_EMPRESA', 'GESTOR_OBRA'].includes(user.role)) {
      throw new ForbiddenError('Apenas gestores podem submeter diários')
    }

    const log = await prisma.dailyLog.findUnique({
      where: { id: params.id },
      include: { _count: { select: { activities: true, laborRecords: true } } },
    })
    if (!log) throw new NotFoundError('Diário não encontrado')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, log.companyId)

    const associated = await isWorksiteAssociated(user, log.worksiteId)
    if (!associated) throw new ForbiddenError()

    if (log.status !== 'RASCUNHO' && log.status !== 'REJEITADO') {
      throw new BusinessError('Apenas diários em rascunho ou rejeitados podem ser submetidos', 'ALREADY_SUBMITTED')
    }

    if (log._count.activities === 0 && log._count.laborRecords === 0) {
      throw new BusinessError(
        'O diário deve ter ao menos uma atividade ou registro de mão de obra antes de ser submetido',
        'EMPTY_DIARY'
      )
    }

    const updated = await prisma.dailyLog.update({
      where: { id: params.id },
      data: { status: 'SUBMETIDO', submittedAt: new Date(), submittedById: user.id },
    })

    await logAuditEvent({
      userId: user.id, companyId: log.companyId,
      action: 'daily_log.submitted', entityType: 'DailyLog', entityId: params.id,
      payload: { date: log.date }, req: _req,
    })

    return ok({ status: updated.status, submittedAt: updated.submittedAt })
  } catch (err) {
    return handleError(err)
  }
}
