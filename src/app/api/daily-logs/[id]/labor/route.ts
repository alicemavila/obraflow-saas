import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, created, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { assertSameTenant, canEditDailyLog, ForbiddenError, NotFoundError, BusinessError } from '@/lib/permissions'
import { createLaborSchema } from '@/lib/validations/daily-log'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    const log = await prisma.dailyLog.findUnique({ where: { id: params.id } })
    if (!log) throw new NotFoundError('Diário não encontrado')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, log.companyId)
    if (user.role === 'CLIENTE_SINDICO' && log.status !== 'APROVADO') throw new ForbiddenError()

    const labor = await prisma.labor.findMany({ where: { dailyLogId: params.id } })
    return ok(labor)
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
    const data = createLaborSchema.parse(body)
    const labor = await prisma.labor.create({
      data: { dailyLogId: params.id, companyId: log.companyId, ...data },
    })
    return created(labor)
  } catch (err) {
    return handleError(err)
  }
}
