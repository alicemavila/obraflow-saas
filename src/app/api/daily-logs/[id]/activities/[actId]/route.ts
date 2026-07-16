import type { NextRequest } from 'next/server'

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
import { createActivitySchema } from '@/lib/validations/daily-log'

type RouteContext = {
  params: Promise<{
    id: string
    actId: string
  }>
}

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
   * Caso exista uma inconsistência no banco, o recurso não é exposto.
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
 * Valida se o usuário pode modificar o diário.
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
      'Cliente ou síndico não pode editar atividades',
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
 * Atualiza uma atividade pertencente a um diário.
 */
export async function PATCH(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const {
      id: dailyLogId,
      actId: activityId,
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
      createActivitySchema
        .partial()
        .parse(body)

    if (
      Object.keys(data).length === 0
    ) {
      throw new BusinessError(
        'Informe pelo menos um campo para atualizar',
        'NO_FIELDS_TO_UPDATE',
      )
    }

    /*
     * Confirma que a atividade realmente pertence:
     * - ao diário informado;
     * - à mesma empresa do diário.
     */
    const existingActivity =
      await prisma.activity.findFirst({
        where: {
          id: activityId,
          dailyLogId,
          companyId:
            dailyLog.companyId,
        },

        select: {
          id: true,
          order: true,
        },
      })

    if (!existingActivity) {
      throw new NotFoundError(
        'Atividade não encontrada neste diário',
      )
    }

    /*
     * O filtro pelo status do diário protege contra concorrência.
     *
     * Se o diário for aprovado entre a validação inicial e esta
     * atualização, nenhuma atividade será modificada.
     */
    const updateResult =
      await prisma.activity.updateMany({
        where: {
          id: activityId,
          dailyLogId,
          companyId:
            dailyLog.companyId,

          dailyLog: {
            status: {
              not: 'APROVADO',
            },
          },
        },

        data,
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
        'Atividade não encontrada neste diário',
      )
    }

    const updatedActivity =
      await prisma.activity.findFirst({
        where: {
          id: activityId,
          dailyLogId,
          companyId:
            dailyLog.companyId,
        },
      })

    if (!updatedActivity) {
      throw new NotFoundError(
        'Atividade não encontrada neste diário',
      )
    }

    await logAuditEvent({
      userId: user.id,
      companyId:
        dailyLog.companyId,

      action:
        'daily_log.activity_updated',

      entityType:
        'Activity',

      entityId:
        activityId,

      payload: {
        dailyLogId,
        worksiteId:
          dailyLog.worksiteId,
        changedFields:
          Object.keys(data),
      },

      req,
    })

    return ok(
      updatedActivity,
      'Atividade atualizada',
    )
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Remove uma atividade pertencente a um diário.
 */
export async function DELETE(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const {
      id: dailyLogId,
      actId: activityId,
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
     * Busca a atividade antes da exclusão para validar tenant,
     * vínculo com o diário e registrar a auditoria.
     */
    const existingActivity =
      await prisma.activity.findFirst({
        where: {
          id: activityId,
          dailyLogId,
          companyId:
            dailyLog.companyId,
        },

        select: {
          id: true,
          order: true,
        },
      })

    if (!existingActivity) {
      throw new NotFoundError(
        'Atividade não encontrada neste diário',
      )
    }

    /*
     * Também bloqueia a exclusão caso o diário seja aprovado
     * durante o processamento da requisição.
     */
    const deleteResult =
      await prisma.activity.deleteMany({
        where: {
          id: activityId,
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
        'Atividade não encontrada neste diário',
      )
    }

    await logAuditEvent({
      userId: user.id,
      companyId:
        dailyLog.companyId,

      action:
        'daily_log.activity_removed',

      entityType:
        'Activity',

      entityId:
        existingActivity.id,

      payload: {
        dailyLogId,
        worksiteId:
          dailyLog.worksiteId,
        previousOrder:
          existingActivity.order,
      },

      req,
    })

    return ok(
      null,
      'Atividade removida',
    )
  } catch (error) {
    return handleError(error)
  }
}