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
import { createOccurrenceSchema } from '@/lib/validations/daily-log'

type RouteContext = {
  params: Promise<{
    id: string
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
 * Lista as ocorrências de um diário.
 *
 * Regras:
 * - o usuário precisa ter acesso à obra;
 * - cliente/síndico visualiza somente diário aprovado;
 * - as ocorrências são filtradas também pelo companyId.
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

    const occurrences =
      await prisma.occurrence.findMany({
        where: {
          dailyLogId,
          companyId:
            dailyLog.companyId,
        },

        include: {
          createdBy: {
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

    return ok(occurrences)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Adiciona uma ocorrência ao diário.
 *
 * Regras:
 * - cliente/síndico não pode criar ocorrência;
 * - gestor e colaborador precisam estar associados à obra;
 * - colaborador edita somente o diário criado por ele;
 * - diário aprovado não pode receber novas ocorrências;
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
        'Cliente ou síndico não pode adicionar ocorrências ao diário',
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
        'Você não possui permissão para adicionar ocorrências a este diário',
      )
    }

    const body: unknown =
      await req.json()

    const data =
      createOccurrenceSchema.parse(
        body,
      )

    /*
     * Verifica novamente o status do diário dentro da transação,
     * antes de criar a ocorrência.
     */
    const occurrence =
      await prisma.$transaction(
        async (transaction) => {
          const currentDailyLog =
            await transaction.dailyLog.findFirst({
              where: {
                id: dailyLogId,
                companyId:
                  dailyLog.companyId,
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

          return transaction.occurrence.create({
            data: {
              dailyLogId,
              companyId:
                dailyLog.companyId,

              ...data,

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
        'daily_log.occurrence_created',

      entityType:
        'Occurrence',

      entityId:
        occurrence.id,

      payload: {
        dailyLogId,
        worksiteId:
          dailyLog.worksiteId,
      },

      req,
    })

    return created(
      occurrence,
      'Ocorrência adicionada ao diário',
    )
  } catch (error) {
    return handleError(error)
  }
}