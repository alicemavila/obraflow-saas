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
import { createLaborSchema } from '@/lib/validations/daily-log'

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
 * Lista os registros de mão de obra de um diário.
 *
 * Regras:
 * - o usuário precisa ter acesso à obra;
 * - cliente/síndico visualiza somente diário aprovado;
 * - os registros são filtrados também pelo companyId.
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

    const laborRecords =
      await prisma.labor.findMany({
        where: {
          dailyLogId,
          companyId:
            dailyLog.companyId,
        },

        orderBy: {
          createdAt: 'asc',
        },
      })

    return ok(laborRecords)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Adiciona um registro de mão de obra ao diário.
 *
 * Regras:
 * - cliente/síndico não pode criar registros;
 * - gestor e colaborador precisam estar associados à obra;
 * - colaborador edita somente o diário criado por ele;
 * - diário aprovado não pode receber novos registros;
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
        'Cliente ou síndico não pode adicionar mão de obra ao diário',
      )
    }

    const dailyLog =
      await getDailyLogOrThrow(
        dailyLogId,
      )

    /*
     * Impede acesso a um diário de outra obra da mesma empresa.
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
        'Você não possui permissão para adicionar mão de obra a este diário',
      )
    }

    const body: unknown =
      await req.json()

    const data =
      createLaborSchema.parse(body)

    /*
     * A situação do diário é verificada novamente dentro
     * da transação antes da criação do registro.
     */
    const laborRecord =
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

          return transaction.labor.create({
            data: {
              dailyLogId,
              companyId:
                dailyLog.companyId,

              ...data,
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
        'daily_log.labor_created',

      entityType:
        'Labor',

      entityId:
        laborRecord.id,

      payload: {
        dailyLogId,
        worksiteId:
          dailyLog.worksiteId,
      },

      req,
    })

    return created(
      laborRecord,
      'Registro de mão de obra adicionado',
    )
  } catch (error) {
    return handleError(error)
  }
}