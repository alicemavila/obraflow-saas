import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { created, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { ForbiddenError, BusinessError } from '@/lib/permissions'
import { generatePresignedDownloadUrl, ALLOWED_IMAGE_TYPES } from '@/lib/s3'
import { logAuditEvent } from '@/lib/audit'
import { z } from 'zod'
import { AttachmentEntityType } from '@prisma/client'

const schema = z.object({
  storageKey: z.string().min(1),
  entityType: z.nativeEnum(AttachmentEntityType),
  entityId: z.string().uuid(),
  fileName: z.string().min(1).max(500),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1),
  caption: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (user.role === 'CLIENTE_SINDICO') throw new ForbiddenError()

    const body = await req.json()
    const data = schema.parse(body)

    const attachment = await prisma.attachment.create({
      data: {
        companyId: user.companyId ?? '',
        entityType: data.entityType,
        entityId: data.entityId,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        storageKey: data.storageKey,
        isPublic: false,
        uploadedById: user.id,
      },
    })

    // Se for imagem, cria registro Photo
    let photoId: string | undefined
    if (ALLOWED_IMAGE_TYPES.includes(data.mimeType)) {
      const photo = await prisma.photo.create({
        data: {
          attachmentId: attachment.id,
          companyId: user.companyId ?? '',
          caption: data.caption,
        },
      })
      photoId = photo.id
    }

    const url = await generatePresignedDownloadUrl(data.storageKey)

    await logAuditEvent({
      userId: user.id,
      companyId: user.companyId,
      action: 'attachment.uploaded',
      entityType: data.entityType,
      entityId: data.entityId,
      payload: { fileName: data.fileName, mimeType: data.mimeType, fileSize: data.fileSize },
      req,
    })

    return created({ attachmentId: attachment.id, photoId, url })
  } catch (err) {
    return handleError(err)
  }
}
