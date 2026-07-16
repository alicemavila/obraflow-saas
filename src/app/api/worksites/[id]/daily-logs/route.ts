import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, created, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import {
  assertSameTenant, isWorksiteAssociated,
  worksiteAcceptsDailyLog, ForbiddenError, NotFoundError,
  ConflictError, BusinessError,
} from '@/lib/permissions'
import { createDailyLogSchema } from '@/lib/validations/daily-log'
import { logAuditEvent } from '@/lib/audit'

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser()

    const worksite = await prisma.worksite.findUnique({ where: { id: params.id } })
    if (!worksite) throw new NotFoundError('Obra não encontrada')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, worksite.companyId)

    const associated = await isWorksiteAssociated(user, params.id)
    if (!associated) throw new ForbiddenError('Você não tem acesso a esta obra')

    const { searchParams } = req.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const perPage = Math.min(100, parseInt(searchParams.get('perPage') ?? '20', 10))
    const status = searchParams.get('status') ?? undefined
    const dateFrom = searchParams.get('dateFrom') ?? undefined
    const dateTo = searchParams.get('dateTo') ?? undefined

    // CLIENTE_SINDICO só vê diários aprovados
    const statusFilter = user.role === 'CLIENTE_SINDICO' ? 'APROVADO' : status

    const where = {
      worksiteId: params.id,
      companyId: worksite.companyId,
      ...(statusFilter && { status: statusFilter as never }),
      ...(dateFrom && { date: { gte: new Date(dateFrom) } }),
      ...(dateTo && { date: { lte: new Date(dateTo) } }),
    }

    const [total, logs] = await prisma.$transaction([
      prisma.dailyLog.count({ where }),
      prisma.dailyLog.findMany({
        where,
        select: {
          id: true, date: true, status: true,
          weatherMorning: true, weatherAfternoon: true,
          tempMin: true, tempMax: true, workedHours: true,
          createdAt: true, approvedAt: true,
          createdBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
          _count: { select: { activities: true, laborRecords: true, occurrences: true } },
        },
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { date: 'desc' },
      }),
    ])

    return ok({ data: logs, meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) } })
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser()
    if (user.role === 'CLIENTE_SINDICO') throw new ForbiddenError()

    const worksite = await prisma.worksite.findUnique({ where: { id: params.id } })
    if (!worksite) throw new NotFoundError('Obra não encontrada')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, worksite.companyId)

    if (!worksiteAcceptsDailyLog(worksite.status)) {
      throw new BusinessError('Obra não está em andamento', 'WORKSITE_INACTIVE')
    }

    const associated = await isWorksiteAssociated(user, params.id)
    if (!associated) throw new ForbiddenError('Você não tem acesso a esta obra')

    const body = await req.json()
    const data = createDailyLogSchema.parse(body)

    const dateObj = new Date(data.date + 'T00:00:00.000Z')

    // Unicidade por obra + data
    const existing = await prisma.dailyLog.findUnique({
      where: { worksiteId_date: { worksiteId: params.id, date: dateObj } },
    })
    if (existing) {
      throw new ConflictError(
        `Já existe um diário para ${data.date} nesta obra`,
        'DAILY_LOG_ALREADY_EXISTS'
      )
    }

    const log = await prisma.dailyLog.create({
      data: {
        worksiteId: params.id,
        companyId: worksite.companyId,
        date: dateObj,
        weatherMorning: data.weatherMorning,
        weatherAfternoon: data.weatherAfternoon,
        weatherEvening: data.weatherEvening,
        tempMin: data.tempMin,
        tempMax: data.tempMax,
        workedHours: data.workedHours,
        notes: data.notes,
        status: 'RASCUNHO',
        createdById: user.id,
      },
    })

    await logAuditEvent({
      userId: user.id, companyId: worksite.companyId,
      action: 'daily_log.created', entityType: 'DailyLog', entityId: log.id,
      payload: { date: data.date, worksiteId: params.id }, req,
    })

    return created(log, 'Diário criado com sucesso')
  } catch (err) {
    return handleError(err)
  }
}
