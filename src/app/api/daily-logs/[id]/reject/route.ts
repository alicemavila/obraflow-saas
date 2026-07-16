import type { NextRequest } from 'next/server'

import {
  handleError,
  ok,
} from '@/lib/api-response'
import { logAuditEvent } from '@/lib/audit'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import {
  assertWorksiteAccess,
  BusinessError,
  canApproveDailyLog,
  ForbiddenError,
  NotFoundError,
} from '@/lib/permissions'
import {
  rejectDailyLogSchema,
} from '@/lib/validations/daily-log'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

/**
 * Rejeita um diário submetido.
 *
 * Regras:
 * - somente usuários com permissão de aprovação podem rejeitar;
 * - o usuário precisa ter acesso à obra;
 * - apenas diários com status SUBMETIDO podem ser rejeitados;
 * - o motivo da rejeição é obrigatório;
 * - a atualização valida novamente o status para evitar concorrência.
 */
export async function POST(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const {
      id: dailyLogId,
    } = await context.params

    const user =
      await getCurrentUser()

    if (
      !canApproveDailyLog(user)
    ) {
      throw new ForbiddenError(
        'Você não possui permissão para rejeitar diários',
      )
    }

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
          date: true,
          submittedAt: true,
          submittedById: true,

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
     * Uma inconsistência de tenant não deve revelar o recurso.
     */
    if (
      dailyLog.companyId !==
      dailyLog.worksite.companyId
    ) {
      throw new NotFoundError(
        'Diário não encontrado',
      )
    }

    /*
     * Valida tenant e associação com a obra.
     *
     * SUPER_ADMIN valida a existência da obra;
     * ADMIN_EMPRESA valida a empresa;
     * GESTOR_OBRA precisa estar associado à obra.
     */
    await assertWorksiteAccess(
      user,
      dailyLog.worksiteId,
    )

    if (
      dailyLog.status !==
      'SUBMETIDO'
    ) {
      throw new BusinessError(
        'Apenas diários submetidos podem ser rejeitados',
        'INVALID_STATUS',
      )
    }

    const body: unknown =
      await req.json()

    const {
      reason,
    } = rejectDailyLogSchema.parse(
      body,
    )

    const rejectedAt =
      new Date()

    /*
     * O updateMany reaplica o status esperado.
     *
     * Caso outra requisição aprove, rejeite ou altere o diário
     * entre a consulta e a atualização, nenhuma mudança ocorrerá.
     */
    const updateResult =
      await prisma.dailyLog.updateMany({
        where: {
          id: dailyLogId,
          companyId:
            dailyLog.companyId,
          worksiteId:
            dailyLog.worksiteId,
          status:
            'SUBMETIDO',
        },

        data: {
          status:
            'REJEITADO',

          rejectedAt,

          rejectedById:
            user.id,

          rejectionReason:
            reason,
        },
      })

    if (
      updateResult.count === 0
    ) {
      const currentDailyLog =
        await prisma.dailyLog.findFirst({
          where: {
            id: dailyLogId,
            companyId:
              dailyLog.companyId,
            worksiteId:
              dailyLog.worksiteId,
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

      throw new BusinessError(
        'O diário já foi processado ou teve seu status alterado',
        'INVALID_STATUS',
      )
    }

    const updatedDailyLog =
      await prisma.dailyLog.findFirst({
        where: {
          id: dailyLogId,
          companyId:
            dailyLog.companyId,
          worksiteId:
            dailyLog.worksiteId,
        },

        select: {
          status: true,
          rejectedAt: true,
          rejectionReason: true,
        },
      })

    if (!updatedDailyLog) {
      throw new NotFoundError(
        'Diário não encontrado',
      )
    }

    await logAuditEvent({
      userId:
        user.id,

      companyId:
        dailyLog.companyId,

      action:
        'daily_log.rejected',

      entityType:
        'DailyLog',

      entityId:
        dailyLogId,

      payload: {
        worksiteId:
          dailyLog.worksiteId,

        date:
          dailyLog.date,

        previousStatus:
          dailyLog.status,

        currentStatus:
          updatedDailyLog.status,

        submittedAt:
          dailyLog.submittedAt,

        submittedById:
          dailyLog.submittedById,

        reason,
      },

      req,
    })

    return ok(
      {
        status:
          updatedDailyLog.status,

        rejectedAt:
          updatedDailyLog.rejectedAt,

        rejectionReason:
          updatedDailyLog.rejectionReason,
      },
      'Diário rejeitado',
    )
  } catch (error) {
    return handleError(error)
  }
}