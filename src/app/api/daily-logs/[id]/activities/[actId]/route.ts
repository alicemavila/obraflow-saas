import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { assertSameTenant, canEditDailyLog, ForbiddenError, NotFoundError, BusinessError } from '@/lib/permissions'
import { createActivitySchema } from '@/lib/validations/daily-log'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; actId: string } }
) {
  try {
    const user = await getCurrentUser()
    if (user.role === 'CLIENTE_SINDICO') throw new ForbiddenError()

    const log = await prisma.dailyLog.findUnique({ where: { id: params.id } })
    if (!log) throw new NotFoundError('Diário não encontrado')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, log.companyId)

    if (!canEditDailyLog(user, log.status, log.createdById)) {
      throw new BusinessError('Diário não pode ser editado', 'DIARY_ALREADY_APPROVED')
    }

    const body = await req.json()
    const data = createActivitySchema.partial().parse(body)

    const activity = await prisma.activity.findFirst({
      where: { id: params.actId, dailyLogId: params.id },
      select: { id: true },
    })
    if (!activity) throw new NotFoundError('Atividade não encontrada neste diário')

    const updated = await prisma.activity.update({
      where: { id: activity.id },
      data,
    })
    return ok(updated)
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; actId: string } }
) {
  try {
    const user = await getCurrentUser()
    if (user.role === 'CLIENTE_SINDICO') throw new ForbiddenError()

    const log = await prisma.dailyLog.findUnique({ where: { id: params.id } })
    if (!log) throw new NotFoundError('Diário não encontrado')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, log.companyId)

    if (!canEditDailyLog(user, log.status, log.createdById)) {
      throw new BusinessError('Diário não pode ser editado', 'DIARY_ALREADY_APPROVED')
    }

    const deleted = await prisma.activity.deleteMany({
      where: { id: params.actId, dailyLogId: params.id },
    })
    if (deleted.count === 0) throw new NotFoundError('Atividade não encontrada neste diário')

    return ok(null, 'Atividade removida')
  } catch (err) {
    return handleError(err)
  }
}
