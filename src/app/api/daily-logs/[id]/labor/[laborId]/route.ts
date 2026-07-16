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
import { createLaborSchema } from '@/lib/validations/daily-log'

type RouteContext = {
  params: Promise<{
    id: string
    laborId: string
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
 * Valida se o usuário pode alterar registros do diário.
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
      'Cliente ou síndico não pode editar registros de mão de obra',
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
 * Atualiza um registro de mão de obra pertencente ao diário.
 */
export async function PATCH(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const {
      id: dailyLogId,
      laborId,
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
      createLaborSchema
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
     * Confirma que o registro pertence:
     * - ao diário informado;
     * - à mesma empresa do diário.
     */
    const existingLabor =
      await prisma.labor.findFirst({
        where: {
          id: laborId,
          dailyLogId,
          companyId:
            dailyLog.companyId,
        },

        select: {
          id: true,
        },
      })

    if (!existingLabor) {
      throw new NotFoundError(
        'Registro de mão de obra não encontrado neste diário',
      )
    }

    /*
     * Também valida o status atual do diário no momento
     * da atualização, reduzindo risco de concorrência.
     */
    const updateResult =
      await prisma.labor.updateMany({
        where: {
          id: laborId,
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
        'Registro de mão de obra não encontrado neste diário',
      )
    }

    const updatedLabor =
      await prisma.labor.findFirst({
        where: {
          id: laborId,
          dailyLogId,
          companyId:
            dailyLog.companyId,
        },
      })

    if (!updatedLabor) {
      throw new NotFoundError(
        'Registro de mão de obra não encontrado neste diário',
      )
    }

    await logAuditEvent({
      userId: user.id,
      companyId:
        dailyLog.companyId,

      action:
        'daily_log.labor_updated',

      entityType:
        'Labor',

      entityId:
        laborId,

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
      updatedLabor,
      'Registro de mão de obra atualizado',
    )
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Remove um registro de mão de obra pertencente ao diário.
 */
export async function DELETE(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const {
      id: dailyLogId,
      laborId,
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
     * Valida o vínculo com o diário e o tenant antes da exclusão.
     */
    const existingLabor =
      await prisma.labor.findFirst({
        where: {
          id: laborId,
          dailyLogId,
          companyId:
            dailyLog.companyId,
        },
      })

    if (!existingLabor) {
      throw new NotFoundError(
        'Registro de mão de obra não encontrado neste diário',
      )
    }

    /*
     * Impede a exclusão caso o diário seja aprovado
     * durante o processamento da requisição.
     */
    const deleteResult =
      await prisma.labor.deleteMany({
        where: {
          id: laborId,
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
        'Registro de mão de obra não encontrado neste diário',
      )
    }

    await logAuditEvent({
      userId: user.id,
      companyId:
        dailyLog.companyId,

      action:
        'daily_log.labor_removed',

      entityType:
        'Labor',

      entityId:
        existingLabor.id,

      payload: {
        dailyLogId,
        worksiteId:
          dailyLog.worksiteId,
      },

      req,
    })

    return ok(
      null,
      'Registro de mão de obra removido',
    )
  } catch (error) {
    return handleError(error)
  }
}