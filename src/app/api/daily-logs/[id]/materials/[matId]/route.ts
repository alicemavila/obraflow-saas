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
import { createMaterialSchema } from '@/lib/validations/daily-log'

type RouteContext = {
  params: Promise<{
    id: string
    matId: string
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
 * Valida se o usuário pode alterar materiais do diário.
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
      'Cliente ou síndico não pode editar materiais',
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
 * Atualiza um material pertencente ao diário.
 */
export async function PATCH(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const {
      id: dailyLogId,
      matId: materialId,
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
      createMaterialSchema
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
     * Confirma que o material pertence:
     * - ao diário informado;
     * - à mesma empresa do diário.
     */
    const existingMaterial =
      await prisma.material.findFirst({
        where: {
          id: materialId,
          dailyLogId,
          companyId:
            dailyLog.companyId,
        },

        select: {
          id: true,
        },
      })

    if (!existingMaterial) {
      throw new NotFoundError(
        'Material não encontrado neste diário',
      )
    }

    /*
     * A atualização também verifica o status atual do diário.
     *
     * Se o diário for aprovado durante o processamento,
     * nenhum material será alterado.
     */
    const updateResult =
      await prisma.material.updateMany({
        where: {
          id: materialId,
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
        'Material não encontrado neste diário',
      )
    }

    const updatedMaterial =
      await prisma.material.findFirst({
        where: {
          id: materialId,
          dailyLogId,
          companyId:
            dailyLog.companyId,
        },
      })

    if (!updatedMaterial) {
      throw new NotFoundError(
        'Material não encontrado neste diário',
      )
    }

    await logAuditEvent({
      userId: user.id,
      companyId:
        dailyLog.companyId,

      action:
        'daily_log.material_updated',

      entityType:
        'Material',

      entityId:
        materialId,

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
      updatedMaterial,
      'Material atualizado',
    )
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Remove um material pertencente ao diário.
 */
export async function DELETE(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const {
      id: dailyLogId,
      matId: materialId,
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
     * Valida o vínculo do material com o diário e com o tenant
     * antes da exclusão.
     */
    const existingMaterial =
      await prisma.material.findFirst({
        where: {
          id: materialId,
          dailyLogId,
          companyId:
            dailyLog.companyId,
        },
      })

    if (!existingMaterial) {
      throw new NotFoundError(
        'Material não encontrado neste diário',
      )
    }

    /*
     * Impede a exclusão caso o diário seja aprovado
     * durante o processamento da requisição.
     */
    const deleteResult =
      await prisma.material.deleteMany({
        where: {
          id: materialId,
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
        'Material não encontrado neste diário',
      )
    }

    await logAuditEvent({
      userId: user.id,
      companyId:
        dailyLog.companyId,

      action:
        'daily_log.material_removed',

      entityType:
        'Material',

      entityId:
        existingMaterial.id,

      payload: {
        dailyLogId,
        worksiteId:
          dailyLog.worksiteId,
      },

      req,
    })

    return ok(
      null,
      'Material removido',
    )
  } catch (error) {
    return handleError(error)
  }
}