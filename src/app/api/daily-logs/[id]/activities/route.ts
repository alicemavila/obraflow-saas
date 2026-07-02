import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, created, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { assertSameTenant, canEditDailyLog, ForbiddenError, NotFoundError, BusinessError } from '@/lib/permissions'
import { createActivitySchema } from '@/lib/validations/daily-log'

async function getLogOrThrow(id: string) {
  const log = await prisma.dailyLog.findUnique({ where: { id } })
  if (!log) throw new NotFoundError('Diário não encontrado')
  return log
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    const log = await getLogOrThrow(params.id)
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, log.companyId)
    if (user.role === 'CLIENTE_SINDICO' && log.status !== 'APROVADO') throw new ForbiddenError()

    const activities = await prisma.activity.findMany({
      where: { dailyLogId: params.id },
      orderBy: { order: 'asc' },
    })
    return ok(activities)
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (user.role === 'CLIENTE_SINDICO') throw new ForbiddenError()

    const log = await getLogOrThrow(params.id)
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, log.companyId)

    if (!canEditDailyLog(user, log.status, log.createdById)) {
      throw new BusinessError('Diário não pode ser editado no status atual', 'DIARY_ALREADY_APPROVED')
    }

    const body = await req.json()
    const data = createActivitySchema.parse(body)

    // Próxima ordem
    const maxOrder = await prisma.activity.aggregate({
      where: { dailyLogId: params.id },
      _max: { order: true },
    })

    const activity = await prisma.activity.create({
      data: {
        dailyLogId: params.id,
        companyId: log.companyId,
        ...data,
        order: data.order ?? (maxOrder._max.order ?? 0) + 1,
        createdById: user.id,
      },
    })
    return created(activity)
  } catch (err) {
    return handleError(err)
  }
}
