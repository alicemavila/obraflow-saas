import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { handleError, ok } from '@/lib/api-response'
import { logAuditEvent } from '@/lib/audit'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import {
  assertWorksiteAccess,
  BusinessError,
  canEditDailyLog,
  ForbiddenError,
  NotFoundError,
} from '@/lib/permissions'
import { createOccurrenceSchema } from '@/lib/validations/daily-log'

type RouteContext = {
  params: Promise<{
    id: string
    occId: string
  }>
}

const resolveSchema = z.object({
  isResolved: z.boolean(),
})

const updateOccurrenceSchema =
  createOccurrenceSchema
    .partial()
    .merge(resolveSchema.partial())

/**
 * Busca o diário com os dados necessários para autorização.
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
        createdById: true,

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
   * O diário e a obra precisam pertencer à mesma empresa.
   * Uma inconsistência de tenant não deve ser exposta.
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
 * Valida se o usuário pode alterar ocorrências do diário.
 */
async function assertDailyLogEditAccess(
  user: Awaited<
    ReturnType<typeof getCurrentUser>
  >,
  dailyLog: Awaited<
    ReturnType<typeof getDailyLogOrThrow>
  >,
): Promise<void> {
  if (
    user.role ===
    'CLIENTE_SINDICO'
  ) {
    throw new ForbiddenError(
      'Cliente ou síndico não pode editar ocorrências',
    )
  }

  /*
   * Garante isolamento entre empresas e associação à obra.
   */
  await assertWorksiteAccess(
    user,
    dailyLog.worksiteId,
  )

  if (
    dailyLog.status ===
    'APROVADO'
  ) {
    throw new BusinessError(
      'Diário aprovado não pode ser editado',
      'DIARY_ALREADY_APPROVED',
    )
  }

  if (
    !canEditDailyLog(
      user,
      dailyLog.status,
      dailyLog.createdById,
    )
  ) {
    throw new ForbiddenError(
      'Você não possui permissão para editar este diário',
    )
  }
}

/**
 * Atualiza uma ocorrência pertencente ao diário.
 */
export async function PATCH(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const {
      id: dailyLogId,
      occId: occurrenceId,
    } = await context.params

    const user =
      await getCurrentUser()

    const dailyLog =
      await getDailyLogOrThrow(
        dailyLogId,
      )

    await assertDailyLogEditAccess(
      user,
      dailyLog,
    )

    const body: unknown =
      await req.json()

    const data =
      updateOccurrenceSchema.parse(body)

    if (
      Object.keys(data).length === 0
    ) {
      throw new BusinessError(
        'Informe pelo menos um campo para atualizar',
        'NO_FIELDS_TO_UPDATE',
      )
    }

    /*
     * Confirma que a ocorrência pertence:
     * - ao diário informado;
     * - à mesma empresa do diário.
     */
    const existingOccurrence =
      await prisma.occurrence.findFirst({
        where: {
          id: occurrenceId,
          dailyLogId,
          companyId:
            dailyLog.companyId,
        },

        select: {
          id: true,
          isResolved: true,
          resolvedAt: true,
        },
      })

    if (!existingOccurrence) {
      throw new NotFoundError(
        'Ocorrência não encontrada neste diário',
      )
    }

    const occurrenceData = {
      ...data,

      ...(data.isResolved === true && {
        resolvedAt: new Date(),
      }),

      ...(data.isResolved === false && {
        resolvedAt: null,
      }),
    }

    /*
     * A atualização também confere o status atual do diário.
     *
     * Se o diário for aprovado durante a requisição,
     * nenhuma ocorrência será modificada.
     */
    const updateResult =
      await prisma.occurrence.updateMany({
        where: {
          id: occurrenceId,
          dailyLogId,
          companyId:
            dailyLog.companyId,

          dailyLog: {
            status: {
              not: 'APROVADO',
            },
          },
        },

        data: occurrenceData,
      })

    if (updateResult.count === 0) {
      const currentDailyLog =
        await prisma.dailyLog.findUnique({
          where: {
            id: dailyLogId,
          },

          select: {
            status: true,
          },
        })

      if (!currentDailyLog) {
        throw new NotFoundError(
          'Diário não encontrado',
        )
      }

      if (
        currentDailyLog.status ===
        'APROVADO'
      ) {
        throw new BusinessError(
          'Diário aprovado não pode ser editado',
          'DIARY_ALREADY_APPROVED',
        )
      }

      throw new NotFoundError(
        'Ocorrência não encontrada neste diário',
      )
    }

    const updatedOccurrence =
      await prisma.occurrence.findFirst({
        where: {
          id: occurrenceId,
          dailyLogId,
          companyId:
            dailyLog.companyId,
        },
      })

    if (!updatedOccurrence) {
      throw new NotFoundError(
        'Ocorrência não encontrada neste diário',
      )
    }

    await logAuditEvent({
      userId: user.id,
      companyId:
        dailyLog.companyId,

      action:
        'daily_log.occurrence_updated',

      entityType:
        'Occurrence',

      entityId:
        occurrenceId,

      payload: {
        dailyLogId,
        worksiteId:
          dailyLog.worksiteId,
        changedFields:
          Object.keys(data),
        previousIsResolved:
          existingOccurrence.isResolved,
        currentIsResolved:
          updatedOccurrence.isResolved,
      },

      req,
    })

    return ok(
      updatedOccurrence,
      'Ocorrência atualizada',
    )
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Remove uma ocorrência pertencente ao diário.
 */
export async function DELETE(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const {
      id: dailyLogId,
      occId: occurrenceId,
    } = await context.params

    const user =
      await getCurrentUser()

    const dailyLog =
      await getDailyLogOrThrow(
        dailyLogId,
      )

    await assertDailyLogEditAccess(
      user,
      dailyLog,
    )

    /*
     * Valida o vínculo com o diário e com o tenant
     * antes da exclusão.
     */
    const existingOccurrence =
      await prisma.occurrence.findFirst({
        where: {
          id: occurrenceId,
          dailyLogId,
          companyId:
            dailyLog.companyId,
        },

        select: {
          id: true,
          isResolved: true,
          resolvedAt: true,
        },
      })

    if (!existingOccurrence) {
      throw new NotFoundError(
        'Ocorrência não encontrada neste diário',
      )
    }

    /*
     * Impede a exclusão caso o diário seja aprovado
     * durante o processamento da requisição.
     */
    const deleteResult =
      await prisma.occurrence.deleteMany({
        where: {
          id: occurrenceId,
          dailyLogId,
          companyId:
            dailyLog.companyId,

          dailyLog: {
            status: {
              not: 'APROVADO',
            },
          },
        },
      })

    if (deleteResult.count === 0) {
      const currentDailyLog =
        await prisma.dailyLog.findUnique({
          where: {
            id: dailyLogId,
          },

          select: {
            status: true,
          },
        })

      if (!currentDailyLog) {
        throw new NotFoundError(
          'Diário não encontrado',
        )
      }

      if (
        currentDailyLog.status ===
        'APROVADO'
      ) {
        throw new BusinessError(
          'Diário aprovado não pode ser editado',
          'DIARY_ALREADY_APPROVED',
        )
      }

      throw new NotFoundError(
        'Ocorrência não encontrada neste diário',
      )
    }

    await logAuditEvent({
      userId: user.id,
      companyId:
        dailyLog.companyId,

      action:
        'daily_log.occurrence_removed',

      entityType:
        'Occurrence',

      entityId:
        existingOccurrence.id,

      payload: {
        dailyLogId,
        worksiteId:
          dailyLog.worksiteId,
        previousIsResolved:
          existingOccurrence.isResolved,
        previousResolvedAt:
          existingOccurrence.resolvedAt,
      },

      req,
    })

    return ok(
      null,
      'Ocorrência removida',
    )
  } catch (error) {
    return handleError(error)
  }
}