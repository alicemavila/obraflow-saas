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

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

/**
 * Aprova um diário submetido.
 *
 * Regras:
 * - somente usuários com permissão de aprovação;
 * - o usuário precisa ter acesso à obra;
 * - apenas diário SUBMETIDO pode ser aprovado;
 * - a atualização reaplica o status esperado para evitar concorrência;
 * - dados de rejeição anteriores são removidos após a aprovação.
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
        'Você não possui permissão para aprovar diários',
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
     * Diário e obra precisam pertencer à mesma empresa.
     * Uma inconsistência de tenant não deve expor o recurso.
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
     * Valida o tenant e a associação com a obra.
     *
     * SUPER_ADMIN valida a existência da obra;
     * ADMIN_EMPRESA valida a empresa;
     * GESTOR_OBRA precisa estar associado.
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
        'Apenas diários submetidos podem ser aprovados',
        'DIARY_NOT_SUBMITTED',
      )
    }

    const approvedAt =
      new Date()

    /*
     * O updateMany verifica novamente se o diário continua
     * submetido no momento exato da atualização.
     *
     * Isso impede aprovação e rejeição simultâneas.
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
            'APROVADO',

          approvedAt,

          approvedById:
            user.id,

          /*
           * Remove informações de uma rejeição anterior,
           * caso o diário tenha sido corrigido e submetido novamente.
           */
          rejectedAt:
            null,

          rejectedById:
            null,

          rejectionReason:
            null,
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
        'DIARY_NOT_SUBMITTED',
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
          approvedAt: true,
          approvedById: true,
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
        'daily_log.approved',

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
      },

      req,
    })

    return ok(
      {
        status:
          updatedDailyLog.status,

        approvedAt:
          updatedDailyLog.approvedAt,

        approvedById:
          updatedDailyLog.approvedById,
      },
      'Diário aprovado com sucesso',
    )
  } catch (error) {
    return handleError(error)
  }
}