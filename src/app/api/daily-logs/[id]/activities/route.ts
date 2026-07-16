import type { NextRequest } from 'next/server'

import {
  created,
  handleError,
  ok,
} from '@/lib/api-response'
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
   * Proteção contra inconsistência de tenant:
   * o diário e a obra precisam pertencer à mesma empresa.
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
 * Lista as atividades de um diário.
 *
 * Regras:
 * - o usuário precisa ter acesso à obra;
 * - cliente/síndico visualiza somente diário aprovado;
 * - atividades são filtradas também pelo companyId do diário.
 */
export async function GET(
  _req: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: dailyLogId } =
      await context.params

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
     * Retorna 404 para não revelar ao cliente a existência
     * de um diário ainda não aprovado.
     */
    if (
      user.role === 'CLIENTE_SINDICO' &&
      dailyLog.status !== 'APROVADO'
    ) {
      throw new NotFoundError(
        'Diário não encontrado',
      )
    }

    const activities =
      await prisma.activity.findMany({
        where: {
          dailyLogId,
          companyId:
            dailyLog.companyId,
        },

        orderBy: {
          order: 'asc',
        },
      })

    return ok(activities)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Cria uma atividade em um diário.
 *
 * Regras:
 * - cliente/síndico não pode criar atividade;
 * - gestor e colaborador precisam estar associados à obra;
 * - colaborador só altera diário criado por ele;
 * - diário aprovado não pode receber novas atividades;
 * - companyId é obtido do diário, nunca do frontend.
 */
export async function POST(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: dailyLogId } =
      await context.params

    const user =
      await getCurrentUser()

    if (
      user.role ===
      'CLIENTE_SINDICO'
    ) {
      throw new ForbiddenError(
        'Cliente ou síndico não pode adicionar atividades ao diário',
      )
    }

    const dailyLog =
      await getDailyLogOrThrow(
        dailyLogId,
      )

    /*
     * Impede acesso a diário de outra obra da mesma empresa.
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
        'Você não possui permissão para adicionar atividades a este diário',
      )
    }

    const body: unknown =
      await req.json()

    const data =
      createActivitySchema.parse(
        body,
      )

    /*
     * A consulta da maior ordem e a criação ficam na mesma transação.
     */
    const activity =
      await prisma.$transaction(
        async (transaction) => {
          const maxOrder =
            await transaction.activity.aggregate({
              where: {
                dailyLogId,
                companyId:
                  dailyLog.companyId,
              },

              _max: {
                order: true,
              },
            })

          const nextOrder =
            data.order ??
            (maxOrder._max.order ??
              0) +
              1

          return transaction.activity.create({
            data: {
              dailyLogId,
              companyId:
                dailyLog.companyId,

              ...data,

              order:
                nextOrder,

              createdById:
                user.id,
            },
          })
        },
      )

    await logAuditEvent({
      userId:
        user.id,

      companyId:
        dailyLog.companyId,

      action:
        'daily_log.activity_created',

      entityType:
        'Activity',

      entityId:
        activity.id,

      payload: {
        dailyLogId,
        worksiteId:
          dailyLog.worksiteId,
        order:
          activity.order,
      },

      req,
    })

    return created(
      activity,
      'Atividade adicionada ao diário',
    )
  } catch (error) {
    return handleError(error)
  }
}