import type { NextRequest } from 'next/server'

import {
  handleError,
  ok,
} from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import {
  assertWorksiteAccess,
  NotFoundError,
} from '@/lib/permissions'
import {
  generatePresignedDownloadUrl,
} from '@/lib/s3'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

/**
 * Busca o diário e os dados necessários para autorização.
 */
async function getDailyLogOrThrow(
  dailyLogId: string,
) {
  const dailyLog =
    await prisma.dailyLog.findUnique({
      where: {
        id: dailyLogId,
      },

      select: {
        id: true,
        companyId: true,
        worksiteId: true,
        status: true,

        worksite: {
          select: {
            id: true,
            companyId: true,
          },
        },
      },
    })

  if (!dailyLog) {
    throw new NotFoundError(
      'Diário não encontrado',
    )
  }

  /*
   * Diário e obra precisam pertencer à mesma empresa.
   * Em caso de inconsistência, o recurso não é exposto.
   */
  if (
    dailyLog.companyId !==
    dailyLog.worksite.companyId
  ) {
    throw new NotFoundError(
      'Diário não encontrado',
    )
  }

  return dailyLog
}

/**
 * Lista os anexos ativos de um diário.
 *
 * Regras:
 * - o usuário precisa ter acesso à obra;
 * - cliente/síndico visualiza somente anexos de diário aprovado;
 * - anexos excluídos logicamente não são retornados;
 * - a consulta também é filtrada pelo companyId;
 * - storageKey e thumbnailStorageKey não são expostos na resposta.
 */
export async function GET(
  _req: NextRequest,
  context: RouteContext,
) {
  try {
    const {
      id: dailyLogId,
    } = await context.params

    const user =
      await getCurrentUser()

    const dailyLog =
      await getDailyLogOrThrow(
        dailyLogId,
      )

    /*
     * Garante isolamento entre empresas e associação à obra.
     */
    await assertWorksiteAccess(
      user,
      dailyLog.worksiteId,
    )

    /*
     * Retorna 404 para não revelar a existência de um diário
     * ainda não aprovado para cliente/síndico.
     */
    if (
      user.role ===
        'CLIENTE_SINDICO' &&
      dailyLog.status !==
        'APROVADO'
    ) {
      throw new NotFoundError(
        'Diário não encontrado',
      )
    }

    const attachments =
      await prisma.attachment.findMany({
        where: {
          companyId:
            dailyLog.companyId,

          entityType:
            'DAILY_LOG',

          entityId:
            dailyLogId,

          deletedAt:
            null,
        },

        include: {
          photo: true,

          uploadedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },

        orderBy: {
          createdAt: 'asc',
        },
      })

    const attachmentsWithUrls =
      await Promise.all(
        attachments.map(
          async (attachment) => {
            /*
             * As chaves internas do storage são usadas somente
             * no backend e não são retornadas para o cliente.
             */
            const {
              storageKey,
              photo,
              ...safeAttachment
            } = attachment

            let safePhoto:
              | Omit<
                  NonNullable<
                    typeof photo
                  >,
                  'thumbnailStorageKey'
                >
              | null = null

            let thumbnailUrl:
              | string
              | null = null

            if (photo) {
              const {
                thumbnailStorageKey,
                ...photoWithoutStorageKey
              } = photo

              safePhoto =
                photoWithoutStorageKey

              if (
                thumbnailStorageKey
              ) {
                thumbnailUrl =
                  await generatePresignedDownloadUrl(
                    thumbnailStorageKey,
                  )
              }
            }

            const url =
              await generatePresignedDownloadUrl(
                storageKey,
              )

            return {
              ...safeAttachment,
              photo: safePhoto,
              url,
              thumbnailUrl,
            }
          },
        ),
      )

    return ok(
      attachmentsWithUrls,
    )
  } catch (error) {
    return handleError(error)
  }
}