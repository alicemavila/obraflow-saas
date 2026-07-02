import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, created, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { assertSameTenant, isWorksiteAssociated, ForbiddenError, NotFoundError } from '@/lib/permissions'
import { createCommentSchema } from '@/lib/validations/daily-log'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    const log = await prisma.dailyLog.findUnique({ where: { id: params.id } })
    if (!log) throw new NotFoundError('Diário não encontrado')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, log.companyId)
    if (user.role === 'CLIENTE_SINDICO' && log.status !== 'APROVADO') throw new ForbiddenError()

    const comments = await prisma.comment.findMany({
      where: { entityType: 'DAILY_LOG', entityId: params.id, isDeleted: false },
      include: { createdBy: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return ok(comments)
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    const log = await prisma.dailyLog.findUnique({ where: { id: params.id } })
    if (!log) throw new NotFoundError('Diário não encontrado')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, log.companyId)

    // CLIENTE_SINDICO só comenta em aprovados
    if (user.role === 'CLIENTE_SINDICO' && log.status !== 'APROVADO') {
      throw new ForbiddenError('Comentários só são permitidos em diários aprovados')
    }

    const associated = await isWorksiteAssociated(user, log.worksiteId)
    if (!associated) throw new ForbiddenError()

    const body = await req.json()
    const { content } = createCommentSchema.parse(body)

    const comment = await prisma.comment.create({
      data: {
        companyId: log.companyId,
        entityType: 'DAILY_LOG',
        entityId: params.id,
        content,
        createdById: user.id,
      },
      include: { createdBy: { select: { id: true, name: true, avatarUrl: true } } },
    })
    return created(comment)
  } catch (err) {
    return handleError(err)
  }
}
