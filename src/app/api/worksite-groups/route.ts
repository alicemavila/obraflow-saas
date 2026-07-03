import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, created, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { ForbiddenError } from '@/lib/permissions'
import { z } from 'zod'

const createGroupSchema = z.object({
  name: z.string().min(1, 'Nome do grupo obrigatório').max(255),
})

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser()

    const groups = await prisma.worksiteGroup.findMany({
      where: {
        companyId: user.role !== 'SUPER_ADMIN' ? (user.companyId ?? undefined) : undefined,
      },
      select: { id: true, name: true, createdAt: true, _count: { select: { worksites: true } } },
      orderBy: { name: 'asc' },
    })

    return ok(groups)
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)) {
      throw new ForbiddenError('Apenas administradores podem criar grupos')
    }

    const body = await req.json()
    const { name } = createGroupSchema.parse(body)

    const companyId =
      user.role === 'SUPER_ADMIN'
        ? ((body.companyId as string) ?? user.companyId!)
        : user.companyId!

    const group = await prisma.worksiteGroup.create({
      data: { name, companyId },
    })

    return created(group, 'Grupo criado com sucesso')
  } catch (err) {
    return handleError(err)
  }
}
