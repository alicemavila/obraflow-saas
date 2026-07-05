import type { NextRequest } from 'next/server'
import { created, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { ForbiddenError, BusinessError } from '@/lib/permissions'
import { authorizeAttachmentTarget } from '@/lib/attachment-authorization'
import {
  generateStorageKey,
  generatePresignedUploadUrl,
  validateMimeType,
  validateFileSize,
  ALLOWED_TYPES,
} from '@/lib/s3'
import { z } from 'zod'
import { AttachmentEntityType } from '@prisma/client'

const schema = z.object({
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1),
  fileSize: z.number().int().positive(),
  entityType: z.nativeEnum(AttachmentEntityType),
  entityId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (user.role === 'CLIENTE_SINDICO') throw new ForbiddenError('Upload não permitido')

    const body = await req.json()
    const { fileName, mimeType, fileSize, entityType, entityId } = schema.parse(body)

    if (!validateMimeType(mimeType)) {
      throw new BusinessError(
        `Tipo de arquivo não permitido. Tipos aceitos: ${ALLOWED_TYPES.join(', ')}`,
        'UNSUPPORTED_FILE_TYPE'
      )
    }

    if (!validateFileSize(mimeType, fileSize)) {
      throw new BusinessError('Arquivo excede o tamanho máximo permitido', 'FILE_TOO_LARGE')
    }

    const target = await authorizeAttachmentTarget(user, entityType, entityId)

    const storageKey = generateStorageKey(
      target.companyId,
      entityType.toLowerCase().replace('_', '-'),
      target.entityId,
      fileName
    )

    const presignedUrl = await generatePresignedUploadUrl(storageKey, mimeType)

    return created({
      presignedUrl,
      storageKey,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })
  } catch (err) {
    return handleError(err)
  }
}
