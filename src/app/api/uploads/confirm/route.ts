import type { NextRequest } from 'next/server'
import {
  AttachmentEntityType,
  Prisma,
} from '@prisma/client'
import { z } from 'zod'

import {
  created,
  handleError,
} from '@/lib/api-response'
import {
  assertStorageKeyMatchesTarget,
  authorizeAttachmentTarget,
} from '@/lib/attachment-authorization'
import { logAuditEvent } from '@/lib/audit'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import {
  BusinessError,
  ForbiddenError,
} from '@/lib/permissions'
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_TYPES,
  generatePresignedDownloadUrl,
  validateFileNameForMimeType,
  validateFileSize,
  validateMimeType,
} from '@/lib/s3'

const confirmUploadSchema = z.object({
  storageKey: z
    .string()
    .trim()
    .min(1)
    .max(1_000),

  entityType: z.nativeEnum(
    AttachmentEntityType,
  ),

  entityId: z
    .string()
    .uuid(),

  fileName: z
    .string()
    .trim()
    .min(1)
    .max(500),

  fileSize: z
    .number()
    .int()
    .positive(),

  mimeType: z
    .string()
    .trim()
    .min(1)
    .max(255),

  caption: z
    .string()
    .trim()
    .max(500)
    .optional(),
})

export async function POST(
  req: NextRequest,
) {
  try {
    const user =
      await getCurrentUser()

    if (
      user.role ===
      'CLIENTE_SINDICO'
    ) {
      throw new ForbiddenError(
        'Cliente ou síndico não pode enviar anexos',
      )
    }

    const body: unknown =
      await req.json()

    const data =
      confirmUploadSchema.parse(body)

    /*
     * O backend valida o MIME type recebido.
     * A validação não deve depender apenas do frontend.
     */
    if (
      !validateMimeType(
        data.mimeType,
      )
    ) {
      throw new BusinessError(
        `Tipo de arquivo não permitido. Tipos aceitos: ${ALLOWED_TYPES.join(', ')}`,
        'UNSUPPORTED_FILE_TYPE',
      )
    }

    /*
     * Impede combinações como um arquivo executável
     * renomeado com extensão de imagem ou documento.
     */
    if (
      !validateFileNameForMimeType(
        data.fileName,
        data.mimeType,
      )
    ) {
      throw new BusinessError(
        'Nome ou extensão de arquivo não permitido',
        'UNSUPPORTED_FILE_TYPE',
      )
    }

    if (
      !validateFileSize(
        data.mimeType,
        data.fileSize,
      )
    ) {
      throw new BusinessError(
        'Arquivo excede o tamanho máximo permitido',
        'FILE_TOO_LARGE',
      )
    }

    /*
     * Valida:
     * - tenant;
     * - entidade de destino;
     * - permissão do usuário;
     * - associação com a obra, quando aplicável.
     */
    const target =
      await authorizeAttachmentTarget(
        user,
        data.entityType,
        data.entityId,
      )

    /*
     * O storageKey precisa corresponder exatamente ao
     * tenant e à entidade autorizados pelo backend.
     */
    assertStorageKeyMatchesTarget(
      data.storageKey,
      target,
    )

    /*
     * Evita confirmar duas vezes o mesmo objeto enviado ao storage.
     */
    const existingAttachment =
      await prisma.attachment.findFirst({
        where: {
          storageKey:
            data.storageKey,
        },

        select: {
          id: true,
        },
      })

    if (existingAttachment) {
      throw new BusinessError(
        'Este upload já foi confirmado',
        'UPLOAD_ALREADY_CONFIRMED',
      )
    }

    const isImage =
      ALLOWED_IMAGE_TYPES.includes(
        data.mimeType,
      )

    let uploadResult: {
      attachmentId: string
      photoId?: string
    }

    try {
      uploadResult =
        await prisma.$transaction(
          async (transaction) => {
            const attachment =
              await transaction.attachment.create({
                data: {
                  companyId:
                    target.companyId,

                  entityType:
                    target.entityType,

                  entityId:
                    target.entityId,

                  fileName:
                    data.fileName,

                  fileSize:
                    data.fileSize,

                  mimeType:
                    data.mimeType,

                  storageKey:
                    data.storageKey,

                  isPublic:
                    false,

                  uploadedById:
                    user.id,
                },
              })

            let photoId:
              | string
              | undefined

            /*
             * O registro Photo e o Attachment são criados
             * na mesma transação para evitar dados órfãos.
             */
            if (isImage) {
              const photo =
                await transaction.photo.create({
                  data: {
                    attachmentId:
                      attachment.id,

                    companyId:
                      target.companyId,

                    caption:
                      data.caption,
                  },
                })

              photoId =
                photo.id
            }

            return {
              attachmentId:
                attachment.id,
              photoId,
            }
          },
        )
    } catch (error) {
      /*
       * Também protege contra duas confirmações simultâneas,
       * caso storageKey possua restrição única no banco.
       */
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BusinessError(
          'Este upload já foi confirmado',
          'UPLOAD_ALREADY_CONFIRMED',
        )
      }

      throw error
    }

    const url =
      await generatePresignedDownloadUrl(
        data.storageKey,
      )

    await logAuditEvent({
      userId:
        user.id,

      companyId:
        target.companyId,

      action:
        'attachment.uploaded',

      entityType:
        target.entityType,

      entityId:
        target.entityId,

      payload: {
        attachmentId:
          uploadResult.attachmentId,

        photoId:
          uploadResult.photoId,

        fileName:
          data.fileName,

        mimeType:
          data.mimeType,

        fileSize:
          data.fileSize,

        isImage,
      },

      req,
    })

    return created(
      {
        attachmentId:
          uploadResult.attachmentId,

        photoId:
          uploadResult.photoId,

        url,
      },
      'Upload confirmado',
    )
  } catch (error) {
    return handleError(error)
  }
}