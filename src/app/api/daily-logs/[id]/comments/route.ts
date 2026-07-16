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
  NotFoundError,
} from '@/lib/permissions'
import { createCommentSchema } from '@/lib/validations/daily-log'

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
 * Lista os comentários de um diário.
 *
 * Regras:
 * - o usuário precisa ter acesso à obra;
 * - cliente/síndico visualiza somente comentários de diário aprovado;
 * - comentários excluídos logicamente não são retornados;
 * - a consulta também filtra pelo companyId.
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

    const comments =
      await prisma.comment.findMany({
        where: {
          companyId:
            dailyLog.companyId,

          entityType:
            'DAILY_LOG',

          entityId:
            dailyLogId,

          isDeleted:
            false,
        },

        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },

        orderBy: {
          createdAt: 'asc',
        },
      })

    return ok(comments)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Cria um comentário em um diário.
 *
 * Regras:
 * - o usuário precisa ter acesso à obra;
 * - cliente/síndico comenta somente em diário aprovado;
 * - companyId e entityId são obtidos pelo backend;
 * - o conteúdo passa pela validação do schema;
 * - a criação é registrada na auditoria.
 *
 * Comentários não utilizam canEditDailyLog porque não alteram
 * diretamente os dados técnicos do diário.
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

    const dailyLog =
      await getDailyLogOrThrow(
        dailyLogId,
      )

    /*
     * Impede comentários em diário de outra obra da mesma empresa.
     */
    await assertWorksiteAccess(
      user,
      dailyLog.worksiteId,
    )

    if (
      user.role === 'CLIENTE_SINDICO' &&
      dailyLog.status !== 'APROVADO'
    ) {
      throw new NotFoundError(
        'Diário não encontrado',
      )
    }

    const body: unknown =
      await req.json()

    const {
      content,
    } = createCommentSchema.parse(body)

    /*
     * O status é verificado novamente dentro da transação.
     * Isso evita que um cliente comente caso o status do diário
     * seja alterado durante o processamento da requisição.
     */
    const comment =
      await prisma.$transaction(
        async (transaction) => {
          const currentDailyLog =
            await transaction.dailyLog.findFirst({
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

          if (
            user.role ===
              'CLIENTE_SINDICO' &&
            currentDailyLog.status !==
              'APROVADO'
          ) {
            throw new NotFoundError(
              'Diário não encontrado',
            )
          }

          return transaction.comment.create({
            data: {
              companyId:
                dailyLog.companyId,

              entityType:
                'DAILY_LOG',

              entityId:
                dailyLogId,

              content,

              createdById:
                user.id,
            },

            include: {
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
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
        'daily_log.comment_created',

      entityType:
        'Comment',

      entityId:
        comment.id,

      /*
       * O conteúdo não é registrado na auditoria para evitar
       * duplicação desnecessária de texto potencialmente pessoal.
       */
      payload: {
        dailyLogId,
        worksiteId:
          dailyLog.worksiteId,
      },

      req,
    })

    return created(
      comment,
      'Comentário adicionado',
    )
  } catch (error) {
    return handleError(error)
  }
}