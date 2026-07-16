import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import {
  assertSameTenant, isWorksiteAssociated,
  canEditDailyLog, ForbiddenError, NotFoundError, BusinessError,
} from '@/lib/permissions'
import { updateDailyLogSchema } from '@/lib/validations/daily-log'
import { logAuditEvent } from '@/lib/audit'

async function getDailyLogOrThrow(id: string) {
  const log = await prisma.dailyLog.findUnique({
    where: { id },
    include: {
      worksite: { select: { id: true, name: true, status: true } },
      createdBy: { select: { id: true, name: true } },
      submittedBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      rejectedBy: { select: { id: true, name: true } },
      activities: { orderBy: { order: 'asc' } },
      laborRecords: true,
      materials: true,
      occurrences: true,
    },
  })
  if (!log) throw new NotFoundError('Diário não encontrado')
  return log
}

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser()
    const log = await getDailyLogOrThrow(params.id)

    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, log.companyId)

    const associated = await isWorksiteAssociated(user, log.worksiteId)
    if (!associated) throw new ForbiddenError()

    // CLIENTE_SINDICO só vê aprovados
    if (user.role === 'CLIENTE_SINDICO' && log.status !== 'APROVADO') {
      throw new ForbiddenError('Acesso restrito a diários aprovados')
    }

    return ok(log)
  } catch (err) {
    return handleError(err)
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser()
    if (user.role === 'CLIENTE_SINDICO') throw new ForbiddenError()

    const log = await getDailyLogOrThrow(params.id)
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, log.companyId)

    if (!canEditDailyLog(user, log.status, log.createdById)) {
      throw new BusinessError(
        log.status === 'APROVADO'
          ? 'Diário aprovado não pode ser editado'
          : 'Você não tem permissão para editar este diário',
        'DIARY_ALREADY_APPROVED'
      )
    }

    const body = await req.json()
    const data = updateDailyLogSchema.parse(body)

    const updated = await prisma.dailyLog.update({
      where: { id: params.id },
      data: {
        weatherMorning: data.weatherMorning,
        weatherAfternoon: data.weatherAfternoon,
        weatherEvening: data.weatherEvening,
        tempMin: data.tempMin,
        tempMax: data.tempMax,
        workedHours: data.workedHours,
        notes: data.notes,
      },
    })

    await logAuditEvent({
      userId: user.id, companyId: log.companyId,
      action: 'daily_log.updated', entityType: 'DailyLog', entityId: params.id,
      payload: data as Record<string, unknown>, req,
    })

    return ok(updated, 'Diário atualizado')
  } catch (err) {
    return handleError(err)
  }
}
