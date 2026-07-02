import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { ForbiddenError } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)) throw new ForbiddenError()

    const { searchParams } = req.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const perPage = Math.min(100, parseInt(searchParams.get('perPage') ?? '50', 10))
    const action = searchParams.get('action') ?? undefined
    const userId = searchParams.get('userId') ?? undefined
    const entityType = searchParams.get('entityType') ?? undefined
    const dateFrom = searchParams.get('dateFrom') ?? undefined
    const dateTo = searchParams.get('dateTo') ?? undefined

    const where = {
      ...(user.role !== 'SUPER_ADMIN' && { companyId: user.companyId }),
      ...(action && { action: { contains: action } }),
      ...(userId && { userId }),
      ...(entityType && { entityType }),
      ...(dateFrom || dateTo) && {
        createdAt: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo) }),
        },
      },
    }

    const [total, logs] = await prisma.$transaction([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        select: {
          id: true, action: true, entityType: true, entityId: true,
          userEmail: true, ipAddress: true, createdAt: true, payload: true,
          user: { select: { id: true, name: true } },
        },
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return ok({ data: logs, meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) } })
  } catch (err) {
    return handleError(err)
  }
}
