import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { assertSameTenant, canEditDailyLog, ForbiddenError, NotFoundError, BusinessError } from '@/lib/permissions'
import { createLaborSchema } from '@/lib/validations/daily-log'

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string; laborId: string }> }
) {
  const params = await props.params;
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
    const data = createLaborSchema.partial().parse(body)
    const labor = await prisma.labor.findFirst({
      where: { id: params.laborId, dailyLogId: params.id },
      select: { id: true },
    })
    if (!labor) throw new NotFoundError('Registro de mão de obra não encontrado neste diário')

    const updated = await prisma.labor.update({ where: { id: labor.id }, data })
    return ok(updated)
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string; laborId: string }> }
) {
  const params = await props.params;
  try {
    const user = await getCurrentUser()
    if (user.role === 'CLIENTE_SINDICO') throw new ForbiddenError()
    const log = await prisma.dailyLog.findUnique({ where: { id: params.id } })
    if (!log) throw new NotFoundError('Diário não encontrado')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, log.companyId)
    if (!canEditDailyLog(user, log.status, log.createdById)) {
      throw new BusinessError('Diário não pode ser editado', 'DIARY_ALREADY_APPROVED')
    }
    const deleted = await prisma.labor.deleteMany({
      where: { id: params.laborId, dailyLogId: params.id },
    })
    if (deleted.count === 0) {
      throw new NotFoundError('Registro de mão de obra não encontrado neste diário')
    }

    return ok(null, 'Registro de mão de obra removido')
  } catch (err) {
    return handleError(err)
  }
}
