import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, created, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { assertSameTenant, canEditDailyLog, ForbiddenError, NotFoundError, BusinessError } from '@/lib/permissions'
import { createOccurrenceSchema } from '@/lib/validations/daily-log'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser()
    const log = await prisma.dailyLog.findUnique({ where: { id: params.id } })
    if (!log) throw new NotFoundError('Diário não encontrado')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, log.companyId)
    if (user.role === 'CLIENTE_SINDICO' && log.status !== 'APROVADO') throw new ForbiddenError()
    const occurrences = await prisma.occurrence.findMany({
      where: { dailyLogId: params.id },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return ok(occurrences)
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
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
    const data = createOccurrenceSchema.parse(body)
    const occurrence = await prisma.occurrence.create({
      data: { dailyLogId: params.id, companyId: log.companyId, ...data, createdById: user.id },
    })
    return created(occurrence)
  } catch (err) {
    return handleError(err)
  }
}
