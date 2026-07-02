import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { ForbiddenError } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)) {
      throw new ForbiddenError()
    }

    const { searchParams } = req.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const perPage = Math.min(100, parseInt(searchParams.get('perPage') ?? '20', 10))
    const role = searchParams.get('role') ?? undefined
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search') ?? undefined

    const where = {
      ...(user.role !== 'SUPER_ADMIN' && { companyId: user.companyId }),
      ...(role && { role: role as never }),
      ...(isActive !== null && { isActive: isActive === 'true' }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [total, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          phone: true,
          avatarUrl: true,
          lastLoginAt: true,
          createdAt: true,
          company: { select: { id: true, name: true, slug: true } },
        },
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { name: 'asc' },
      }),
    ])

    return ok({
      data: users,
      meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
    })
  } catch (err) {
    return handleError(err)
  }
}
