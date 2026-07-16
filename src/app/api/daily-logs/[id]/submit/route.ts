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
  ForbiddenError,
  NotFoundError,
} from '@/lib/permissions'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

const SUBMIT_ALLOWED_ROLES = [
  'SUPER_ADMIN',
  'ADMIN_EMPRESA',
  'GESTOR_OBRA',
] as const

const SUBMIT_ALLOWED_STATUSES = [
  'RASCUNHO',
  'REJEITADO',
] as const

/**
 * Submete um diário para aprovação.
 *
 * Regras:
 * - somente SUPER_ADMIN, ADMIN_EMPRESA e GESTOR_OBRA;
 * - gestor precisa estar associado à obra;
 * - o diário deve estar em RASCUNHO ou REJEITADO;
 * - precisa existir ao menos uma atividade ou mão de obra;
 * - a alteração reaplica o status esperado para evitar concorrência.
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
      !SUBMIT_ALLOWED_ROLES.includes(
        user.role as
          (typeof SUBMIT_ALLOWED_ROLES)[number],
      )
    ) {
      throw new ForbiddenError(
        'Apenas gestores podem submeter diários',
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

          worksite: {
            select: {
              id: true,
              companyId: true,
            },
          },

          _count: {
            select: {
              activities: true,
              laborRecords: true,
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
     * Diário e obra precisam pertencer ao mesmo tenant.
     * Uma inconsistência não deve revelar o recurso.
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
     * Valida tenant e associação do usuário com a obra.
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
      !SUBMIT_ALLOWED_STATUSES.includes(
        dailyLog.status as
          (typeof SUBMIT_ALLOWED_STATUSES)[number],
      )
    ) {
      throw new BusinessError(
        'Apenas diários em rascunho ou rejeitados podem ser submetidos',
        'ALREADY_SUBMITTED',
      )
    }

    if (
      dailyLog._count.activities === 0 &&
      dailyLog._count.laborRecords === 0
    ) {
      throw new BusinessError(
        'O diário deve ter ao menos uma atividade ou registro de mão de obra antes de ser submetido',
        'EMPTY_DIARY',
      )
    }

    const submittedAt =
      new Date()

    /*
     * O updateMany verifica novamente o status.
     *
     * Caso outra requisição altere o diário entre a leitura
     * inicial e a atualização, nenhuma mudança será aplicada.
     */
    const updateResult =
      await prisma.dailyLog.updateMany({
        where: {
          id: dailyLogId,
          companyId:
            dailyLog.companyId,
          worksiteId:
            dailyLog.worksiteId,

          status: {
            in: [
              'RASCUNHO',
              'REJEITADO',
            ],
          },
        },

        data: {
          status:
            'SUBMETIDO',

          submittedAt,

          submittedById:
            user.id,
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
        'O diário já foi submetido ou teve seu status alterado',
        'ALREADY_SUBMITTED',
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
          submittedAt: true,
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
        'daily_log.submitted',

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
      },

      req,
    })

    return ok(
      {
        status:
          updatedDailyLog.status,

        submittedAt:
          updatedDailyLog.submittedAt,
      },
      'Diário submetido para aprovação',
    )
  } catch (error) {
    return handleError(error)
  }
}