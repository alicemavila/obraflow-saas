import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { assertSameTenant, ForbiddenError, NotFoundError, BusinessError } from '@/lib/permissions'
import { logAuditEvent } from '@/lib/audit'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (user.role === 'CLIENTE_SINDICO') throw new ForbiddenError()

    const attachment = await prisma.attachment.findUnique({
      where: { id: params.id },
      include: { uploadedBy: { select: { id: true } } },
    })
    if (!attachment || attachment.deletedAt) throw new NotFoundError('Anexo não encontrado')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, attachment.companyId)

    // Apenas o uploader ou admin pode deletar
    const isOwner = attachment.uploadedById === user.id
    const isAdmin = ['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)
    if (!isOwner && !isAdmin) throw new ForbiddenError()

    // Verifica se o diário associado está aprovado (bloqueia exclusão)
    if (attachment.entityType === 'DAILY_LOG') {
      const log = await prisma.dailyLog.findUnique({
        where: { id: attachment.entityId },
        select: { status: true },
      })
      if (log?.status === 'APROVADO' && !['SUPER_ADMIN'].includes(user.role)) {
        throw new BusinessError('Não é possível remover anexos de diários aprovados', 'DIARY_ALREADY_APPROVED')
      }
    }

    // Soft delete
    await prisma.attachment.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    })

    await logAuditEvent({
      userId: user.id,
      companyId: attachment.companyId,
      action: 'attachment.deleted',
      entityType: 'Attachment',
      entityId: params.id,
      req: _req,
    })

    return ok(null, 'Anexo removido')
  } catch (err) {
    return handleError(err)
  }
}
