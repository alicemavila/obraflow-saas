import type { NextRequest } from 'next/server'
import { AttachmentEntityType } from '@prisma/client'
import { z } from 'zod'

import {
  created,
  handleError,
} from '@/lib/api-response'
import {
  authorizeAttachmentTarget,
} from '@/lib/attachment-authorization'
import { logAuditEvent } from '@/lib/audit'
import { getCurrentUser } from '@/lib/auth-helpers'
import {
  BusinessError,
  canUploadFile,
  ForbiddenError,
} from '@/lib/permissions'
import {
  ALLOWED_TYPES,
  generatePresignedUploadUrl,
  generateStorageKey,
  validateFileNameForMimeType,
  validateFileSize,
  validateMimeType,
} from '@/lib/s3'

const PRESIGNED_UPLOAD_EXPIRATION_MS =
  15 * 60 * 1000

const presignedUploadSchema = z.object({
  fileName: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .refine(
      (fileName) =>
        !/[\u0000-\u001F\u007F/\\]/.test(
          fileName,
        ),
      {
        message:
          'Nome de arquivo inválido',
      },
    ),

  mimeType: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .transform((value) =>
      value.toLowerCase(),
    ),

  fileSize: z
    .number()
    .int()
    .positive(),

  entityType: z.nativeEnum(
    AttachmentEntityType,
  ),

  entityId: z
    .string()
    .uuid(),
})

export async function POST(
  req: NextRequest,
) {
  try {
    const user =
      await getCurrentUser()

    /*
     * A permissão de upload fica centralizada em permissions.ts,
     * evitando regras diferentes entre as rotas.
     */
    if (!canUploadFile(user)) {
      throw new ForbiddenError(
        'Você não possui permissão para enviar arquivos',
      )
    }

    const body: unknown =
      await req.json()

    const {
      fileName,
      mimeType,
      fileSize,
      entityType,
      entityId,
    } = presignedUploadSchema.parse(
      body,
    )

    /*
     * A validação precisa acontecer no backend.
     * A extensão e o MIME type devem formar uma combinação permitida.
     */
    if (
      !validateMimeType(mimeType)
    ) {
      throw new BusinessError(
        `Tipo de arquivo não permitido. Tipos aceitos: ${ALLOWED_TYPES.join(', ')}`,
        'UNSUPPORTED_FILE_TYPE',
      )
    }

    if (
      !validateFileNameForMimeType(
        fileName,
        mimeType,
      )
    ) {
      throw new BusinessError(
        'Nome ou extensão de arquivo não permitido',
        'UNSUPPORTED_FILE_TYPE',
      )
    }

    if (
      !validateFileSize(
        mimeType,
        fileSize,
      )
    ) {
      throw new BusinessError(
        'Arquivo excede o tamanho máximo permitido',
        'FILE_TOO_LARGE',
      )
    }

    /*
     * Valida:
     * - empresa;
     * - entidade de destino;
     * - associação à obra;
     * - permissão sobre o recurso.
     */
    const target =
      await authorizeAttachmentTarget(
        user,
        entityType,
        entityId,
      )

    /*
     * Usa os dados retornados pela autorização, e não os valores
     * enviados diretamente pelo frontend, para formar a chave.
     */
    const entityPath =
      target.entityType
        .toLowerCase()
        .replace(/_/g, '-')

    const storageKey =
      generateStorageKey(
        target.companyId,
        entityPath,
        target.entityId,
        fileName,
      )

    const presignedUrl =
      await generatePresignedUploadUrl(
        storageKey,
        mimeType,
      )

    const expiresAt =
      new Date(
        Date.now() +
          PRESIGNED_UPLOAD_EXPIRATION_MS,
      ).toISOString()

    /*
     * Não registra a URL pré-assinada na auditoria,
     * pois ela concede acesso temporário ao storage.
     */
    await logAuditEvent({
      userId:
        user.id,

      companyId:
        target.companyId,

      action:
        'attachment.upload_url_created',

      entityType:
        target.entityType,

      entityId:
        target.entityId,

      payload: {
        fileName,
        mimeType,
        fileSize,
        expiresAt,
      },

      req,
    })

    return created(
      {
        presignedUrl,
        storageKey,
        expiresAt,
      },
      'URL de upload gerada',
    )
  } catch (error) {
    return handleError(error)
  }
}