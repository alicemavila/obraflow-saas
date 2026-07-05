import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { assertSameTenant, ForbiddenError, NotFoundError } from '@/lib/permissions'
import { createCommentSchema } from '@/lib/validations/daily-log'

export async function PATCH(req: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  try {
    const user = await getCurrentUser()
    const comment = await prisma.comment.findFirst({
      where: { id: params.commentId, entityType: 'DAILY_LOG', entityId: params.id },
    })
    if (!comment || comment.isDeleted) throw new NotFoundError('Comentário não encontrado')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, comment.companyId)

    // Apenas o autor pode editar (dentro de 15 min)
    if (comment.createdById !== user.id) throw new ForbiddenError()
    const ageMs = Date.now() - comment.createdAt.getTime()
    if (ageMs > 15 * 60 * 1000) throw new ForbiddenError('Prazo de edição de 15 minutos expirado')

    const body = await req.json()
    const { content } = createCommentSchema.parse(body)
    const updated = await prisma.comment.update({ where: { id: params.commentId }, data: { content } })
    return ok(updated)
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  try {
    const user = await getCurrentUser()
    const comment = await prisma.comment.findFirst({
      where: { id: params.commentId, entityType: 'DAILY_LOG', entityId: params.id },
    })
    if (!comment || comment.isDeleted) throw new NotFoundError('Comentário não encontrado')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, comment.companyId)

    // Autor ou admin pode deletar
    const isOwner = comment.createdById === user.id
    const isAdmin = ['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)
    if (!isOwner && !isAdmin) throw new ForbiddenError()

    await prisma.comment.update({
      where: { id: params.commentId },
      data: { isDeleted: true, deletedAt: new Date() },
    })
    return ok(null, 'Comentário removido')
  } catch (err) {
    return handleError(err)
  }
}
