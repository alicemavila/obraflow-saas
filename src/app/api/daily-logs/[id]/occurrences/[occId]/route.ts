import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { assertSameTenant, canEditDailyLog, ForbiddenError, NotFoundError, BusinessError } from '@/lib/permissions'
import { createOccurrenceSchema } from '@/lib/validations/daily-log'
import { z } from 'zod'

const resolveSchema = z.object({ isResolved: z.boolean() })

export async function PATCH(req: NextRequest, { params }: { params: { id: string; occId: string } }) {
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
    const data = createOccurrenceSchema.partial().merge(resolveSchema.partial()).parse(body)
    const updated = await prisma.occurrence.update({
      where: { id: params.occId },
      data: {
        ...data,
        ...(data.isResolved === true && { resolvedAt: new Date() }),
        ...(data.isResolved === false && { resolvedAt: null }),
      },
    })
    return ok(updated)
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; occId: string } }) {
  try {
    const user = await getCurrentUser()
    if (user.role === 'CLIENTE_SINDICO') throw new ForbiddenError()
    const log = await prisma.dailyLog.findUnique({ where: { id: params.id } })
    if (!log) throw new NotFoundError('Diário não encontrado')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, log.companyId)
    if (!canEditDailyLog(user, log.status, log.createdById)) {
      throw new BusinessError('Diário não pode ser editado', 'DIARY_ALREADY_APPROVED')
    }
    await prisma.occurrence.delete({ where: { id: params.occId } })
    return ok(null, 'Ocorrência removida')
  } catch (err) {
    return handleError(err)
  }
}
