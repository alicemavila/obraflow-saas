import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, created, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { ForbiddenError, ConflictError } from '@/lib/permissions'
import { createWorksiteSchema } from '@/lib/validations/worksite'
import { logAuditEvent } from '@/lib/audit'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    const { searchParams } = req.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const perPage = Math.min(100, parseInt(searchParams.get('perPage') ?? '20', 10))
    const status = searchParams.get('status') ?? undefined
    const city = searchParams.get('city') ?? undefined
    const search = searchParams.get('search') ?? undefined

    // CLIENTE_SINDICO vê apenas obras associadas
    let worksiteIdsFilter: string[] | undefined
    if (user.role === 'CLIENTE_SINDICO') {
      const assocs = await prisma.worksiteUser.findMany({
        where: { userId: user.id },
        select: { worksiteId: true },
      })
      worksiteIdsFilter = assocs.map((a) => a.worksiteId)
    }

    // GESTOR/COLABORADOR veem apenas obras associadas
    if (user.role === 'GESTOR_OBRA' || user.role === 'COLABORADOR') {
      const assocs = await prisma.worksiteUser.findMany({
        where: { userId: user.id },
        select: { worksiteId: true },
      })
      worksiteIdsFilter = assocs.map((a) => a.worksiteId)
    }

    const where = {
      ...(user.role !== 'SUPER_ADMIN' && { companyId: user.companyId }),
      ...(worksiteIdsFilter !== undefined && { id: { in: worksiteIdsFilter } }),
      ...(status && { status: status as never }),
      ...(city && { city: { contains: city, mode: 'insensitive' as const } }),
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    }

    const [total, worksites] = await prisma.$transaction([
      prisma.worksite.count({ where }),
      prisma.worksite.findMany({
        where,
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          status: true,
          startDate: true,
          endDateForecast: true,
          responsibleName: true,
          clientName: true,
          createdAt: true,
          _count: { select: { dailyLogs: true } },
        },
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return ok({
      data: worksites,
      meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
    })
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)) {
      throw new ForbiddenError('Apenas administradores podem criar obras')
    }

    const body = await req.json()
    const data = createWorksiteSchema.parse(body)

    const companyId = user.role === 'SUPER_ADMIN'
      ? (body.companyId as string ?? user.companyId!)
      : user.companyId!

    // Verifica limite do plano
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: {
            worksites: {
              where: { status: { notIn: ['CONCLUIDA', 'CANCELADA'] } },
            },
          },
        },
      },
    })
    if (company && company._count.worksites >= company.maxWorksites) {
      throw new ConflictError(
        'Limite de obras ativas do plano atingido.',
        'WORKSITE_LIMIT_REACHED'
      )
    }

    const worksite = await prisma.worksite.create({
      data: {
        companyId,
        ...data,
        startDate: new Date(data.startDate),
        endDateForecast: data.endDateForecast ? new Date(data.endDateForecast) : undefined,
        createdById: user.id,
      },
    })

    await logAuditEvent({
      userId: user.id,
      companyId,
      action: 'worksite.created',
      entityType: 'Worksite',
      entityId: worksite.id,
      payload: { name: worksite.name, status: worksite.status },
      req,
    })

    return created(worksite, 'Obra criada com sucesso')
  } catch (err) {
    return handleError(err)
  }
}
