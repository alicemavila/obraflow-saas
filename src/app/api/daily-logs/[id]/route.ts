import type { NextRequest } from 'next/server'

import { handleError, ok } from '@/lib/api-response'
import { logAuditEvent } from '@/lib/audit'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import {
  assertWorksiteAccess,
  BusinessError,
  canEditDailyLog,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '@/lib/permissions'
import { updateDailyLogSchema } from '@/lib/validations/daily-log'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

/**
 * Busca um diário com os dados necessários para visualização
 * e validação das regras de autorização.
 */
async function getDailyLogOrThrow(id: string) {
  const dailyLog = await prisma.dailyLog.findUnique({
    where: {
      id,
    },

    include: {
      worksite: {
        select: {
          id: true,
          name: true,
          status: true,
          companyId: true,
        },
      },

      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },

      submittedBy: {
        select: {
          id: true,
          name: true,
        },
      },

      approvedBy: {
        select: {
          id: true,
          name: true,
        },
      },

      rejectedBy: {
        select: {
          id: true,
          name: true,
        },
      },

      activities: {
        orderBy: {
          order: 'asc',
        },
      },

      laborRecords: true,
      materials: true,
      occurrences: true,
    },
  })

  if (!dailyLog) {
    throw new NotFoundError(
      'Diário não encontrado',
    )
  }

  /*
   * Proteção contra inconsistência de dados:
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
 * Retorna um diário específico.
 *
 * Regras:
 * - SUPER_ADMIN pode acessar qualquer diário;
 * - ADMIN_EMPRESA pode acessar diários da própria empresa;
 * - gestor, colaborador e cliente precisam estar associados à obra;
 * - CLIENTE_SINDICO visualiza somente diários aprovados.
 */
export async function GET(
  _req: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params
    const user = await getCurrentUser()

    const dailyLog =
      await getDailyLogOrThrow(id)

    /*
     * Valida simultaneamente:
     * - existência da obra;
     * - isolamento entre empresas;
     * - associação do usuário com a obra.
     */
    await assertWorksiteAccess(
      user,
      dailyLog.worksiteId,
    )

    /*
     * Retorna 404 para não revelar ao cliente a existência
     * de diários ainda não aprovados.
     */
    if (
      user.role === 'CLIENTE_SINDICO' &&
      dailyLog.status !== 'APROVADO'
    ) {
      throw new NotFoundError(
        'Diário não encontrado',
      )
    }

    return ok(dailyLog)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Atualiza os dados gerais de um diário.
 *
 * Regras:
 * - CLIENTE_SINDICO não edita diários;
 * - gestor e colaborador precisam estar associados à obra;
 * - colaborador edita somente o próprio diário;
 * - diário aprovado não pode ser editado;
 * - administrador só acessa diários do tenant autorizado.
 */
export async function PATCH(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params
    const user = await getCurrentUser()

    if (user.role === 'CLIENTE_SINDICO') {
      throw new ForbiddenError(
        'Cliente ou síndico não pode editar diários',
      )
    }

    const dailyLog =
      await getDailyLogOrThrow(id)

    /*
     * Esta verificação era essencial e estava ausente no PATCH.
     *
     * Sem ela, um gestor poderia editar um diário de outra obra
     * da mesma empresa apenas conhecendo o identificador.
     */
    await assertWorksiteAccess(
      user,
      dailyLog.worksiteId,
    )

    if (dailyLog.status === 'APROVADO') {
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

    const body: unknown = await req.json()

    const data =
      updateDailyLogSchema.parse(body)

    /*
     * O filtro pelo status protege contra concorrência.
     *
     * Caso o diário seja aprovado entre a consulta anterior
     * e a atualização, a alteração será bloqueada.
     */
    const updateResult =
      await prisma.dailyLog.updateMany({
        where: {
          id,
          status: {
            not: 'APROVADO',
          },
        },

        data: {
          ...(data.weatherMorning !== undefined && {
            weatherMorning:
              data.weatherMorning,
          }),

          ...(data.weatherAfternoon !== undefined && {
            weatherAfternoon:
              data.weatherAfternoon,
          }),

          ...(data.weatherEvening !== undefined && {
            weatherEvening:
              data.weatherEvening,
          }),

          ...(data.tempMin !== undefined && {
            tempMin: data.tempMin,
          }),

          ...(data.tempMax !== undefined && {
            tempMax: data.tempMax,
          }),

          ...(data.workedHours !== undefined && {
            workedHours:
              data.workedHours,
          }),

          ...(data.notes !== undefined && {
            notes: data.notes,
          }),
        },
      })

    if (updateResult.count === 0) {
      const currentDailyLog =
        await prisma.dailyLog.findUnique({
          where: {
            id,
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

      throw new ConflictError(
        'O diário foi alterado durante a atualização. Atualize a página e tente novamente.',
        'DAILY_LOG_UPDATE_CONFLICT',
      )
    }

    const updated =
      await prisma.dailyLog.findUnique({
        where: {
          id,
        },
      })

    if (!updated) {
      throw new NotFoundError(
        'Diário não encontrado',
      )
    }

    await logAuditEvent({
      userId: user.id,
      companyId: dailyLog.companyId,
      action: 'daily_log.updated',
      entityType: 'DailyLog',
      entityId: id,

      payload:
        data as Record<string, unknown>,

      req,
    })

    return ok(
      updated,
      'Diário atualizado',
    )
  } catch (error) {
    return handleError(error)
  }
}