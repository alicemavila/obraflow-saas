import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { assertSameTenant, ForbiddenError, NotFoundError } from '@/lib/permissions'
import { generatePresignedDownloadUrl } from '@/lib/s3'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser()
    const log = await prisma.dailyLog.findUnique({ where: { id: params.id } })
    if (!log) throw new NotFoundError('Diário não encontrado')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, log.companyId)
    if (user.role === 'CLIENTE_SINDICO' && log.status !== 'APROVADO') throw new ForbiddenError()

    const attachments = await prisma.attachment.findMany({
      where: { entityType: 'DAILY_LOG', entityId: params.id, deletedAt: null },
      include: { photo: true, uploadedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    })

    // Gera URLs pré-assinadas
    const withUrls = await Promise.all(
      attachments.map(async (a) => ({
        ...a,
        url: await generatePresignedDownloadUrl(a.storageKey),
        thumbnailUrl: a.photo?.thumbnailStorageKey
          ? await generatePresignedDownloadUrl(a.photo.thumbnailStorageKey)
          : null,
      }))
    )

    return ok(withUrls)
  } catch (err) {
    return handleError(err)
  }
}
