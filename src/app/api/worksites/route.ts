import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, created, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { ForbiddenError, ConflictError, BusinessError } from '@/lib/permissions'
import { createWorksiteSchema, calculateWorksiteProfileCompletion } from '@/lib/validations/worksite'
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
    const incomplete = searchParams.get('incomplete')

    // Restrição por associação para GESTOR/COLABORADOR/CLIENTE
    let worksiteIdsFilter: string[] | undefined
    if (['CLIENTE_SINDICO', 'GESTOR_OBRA', 'COLABORADOR'].includes(user.role)) {
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
      ...(incomplete === 'true' && { isProfileComplete: false }),
      ...(incomplete === 'false' && { isProfileComplete: true }),
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
          registrationMode: true,
          isProfileComplete: true,
          createdAt: true,
          group: { select: { id: true, name: true } },
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

    const companyId =
      user.role === 'SUPER_ADMIN'
        ? ((body.companyId as string) ?? user.companyId!)
        : user.companyId!

    // Valida groupId no mesmo tenant (nunca confiar no frontend)
    if (data.groupId) {
      const group = await prisma.worksiteGroup.findFirst({
        where: { id: data.groupId, companyId },
        select: { id: true },
      })
      if (!group) {
        throw new BusinessError('Grupo não encontrado nesta empresa', 'GROUP_NOT_FOUND')
      }
    }

    // Verifica limite do plano
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: {
            worksites: { where: { status: { notIn: ['CONCLUIDA', 'CANCELADA'] } } },
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

    // Calcula se o cadastro está completo (inclui groupId e endDateForecast)
    const isProfileComplete = calculateWorksiteProfileCompletion({
      name: data.name,
      status: data.status,
      groupId: data.groupId || null,
      responsibleName: data.responsibleName || null,
      startDate: data.startDate || null,
      endDateForecast: data.endDateForecast || null,
      registrationMode: data.registrationMode,
    })

    const worksite = await prisma.worksite.create({
      data: {
        companyId,
        name: data.name,
        status: data.status,
        registrationMode: data.registrationMode,
        isProfileComplete,
        hasTaskList: data.hasTaskList ?? false,
        groupId: data.groupId ?? null,
        // Campos opcionais
        address: data.address || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        cep: data.cep || null,
        artNumber: data.artNumber || null,
        responsibleName: data.responsibleName || null,
        responsibleCrea: data.responsibleCrea || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDateForecast: data.endDateForecast ? new Date(data.endDateForecast) : null,
        description: data.description || null,
        clientName: data.clientName || null,
        contractNumber: data.contractNumber || null,
        contractType: data.contractType || null,
        totalArea: data.totalArea ?? null,
        createdById: user.id,
      },
    })

    await logAuditEvent({
      userId: user.id,
      companyId,
      action: 'worksite.created',
      entityType: 'Worksite',
      entityId: worksite.id,
      payload: { name: worksite.name, status: worksite.status, registrationMode: worksite.registrationMode, isProfileComplete },
      req,
    })

    return created(worksite, 'Obra criada com sucesso')
  } catch (err) {
    return handleError(err)
  }
}
