import type { NextRequest } from 'next/server'

import { handleError, ok } from '@/lib/api-response'
import { logAuditEvent } from '@/lib/audit'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import {
  assertWorksiteAccess,
  ForbiddenError,
  NotFoundError,
} from '@/lib/permissions'
import { createCommentSchema } from '@/lib/validations/daily-log'

type RouteContext = {
  params: Promise<{
    id: string
    commentId: string
  }>
}

const COMMENT_EDIT_WINDOW_MS =
  15 * 60 * 1000

/**
 * Busca o diário e valida a consistência entre diário e obra.
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
   * Diário e obra precisam pertencer à mesma empresa.
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
 * Valida o acesso do usuário à obra e ao diário.
 */
async function assertCommentAccess(
  user: Awaited<
    ReturnType<typeof getCurrentUser>
  >,
  dailyLog: Awaited<
    ReturnType<typeof getDailyLogOrThrow>
  >,
): Promise<void> {
  await assertWorksiteAccess(
    user,
    dailyLog.worksiteId,
  )

  /*
   * Cliente/síndico somente acessa comentários
   * vinculados a diários aprovados.
   */
  if (
    user.role === 'CLIENTE_SINDICO' &&
    dailyLog.status !== 'APROVADO'
  ) {
    throw new NotFoundError(
      'Diário não encontrado',
    )
  }
}

/**
 * Atualiza um comentário.
 *
 * Regras:
 * - somente o autor pode editar;
 * - a edição é permitida por até 15 minutos;
 * - o comentário deve pertencer ao diário e à empresa;
 * - comentários excluídos não podem ser editados.
 */
export async function PATCH(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const {
      id: dailyLogId,
      commentId,
    } = await context.params

    const user =
      await getCurrentUser()

    const dailyLog =
      await getDailyLogOrThrow(
        dailyLogId,
      )

    await assertCommentAccess(
      user,
      dailyLog,
    )

    const comment =
      await prisma.comment.findFirst({
        where: {
          id: commentId,
          companyId:
            dailyLog.companyId,
          entityType:
            'DAILY_LOG',
          entityId:
            dailyLogId,
          isDeleted:
            false,
        },

        select: {
          id: true,
          createdById: true,
          createdAt: true,
        },
      })

    if (!comment) {
      throw new NotFoundError(
        'Comentário não encontrado',
      )
    }

    if (
      comment.createdById !==
      user.id
    ) {
      throw new ForbiddenError(
        'Somente o autor pode editar o comentário',
      )
    }

    const commentAge =
      Date.now() -
      comment.createdAt.getTime()

    if (
      commentAge >
      COMMENT_EDIT_WINDOW_MS
    ) {
      throw new ForbiddenError(
        'Prazo de edição de 15 minutos expirado',
      )
    }

    const body: unknown =
      await req.json()

    const {
      content,
    } = createCommentSchema.parse(body)

    const editWindowStart =
      new Date(
        Date.now() -
          COMMENT_EDIT_WINDOW_MS,
      )

    /*
     * O updateMany reaplica todas as restrições no momento
     * da alteração, protegendo contra exclusão concorrente,
     * mudança de autor ou expiração da janela de edição.
     */
    const updateResult =
      await prisma.comment.updateMany({
        where: {
          id: commentId,
          companyId:
            dailyLog.companyId,
          entityType:
            'DAILY_LOG',
          entityId:
            dailyLogId,
          createdById:
            user.id,
          isDeleted:
            false,

          createdAt: {
            gte: editWindowStart,
          },
        },

        data: {
          content,
        },
      })

    if (
      updateResult.count === 0
    ) {
      const currentComment =
        await prisma.comment.findFirst({
          where: {
            id: commentId,
            companyId:
              dailyLog.companyId,
            entityType:
              'DAILY_LOG',
            entityId:
              dailyLogId,
          },

          select: {
            isDeleted: true,
            createdById: true,
            createdAt: true,
          },
        })

      if (
        !currentComment ||
        currentComment.isDeleted
      ) {
        throw new NotFoundError(
          'Comentário não encontrado',
        )
      }

      if (
        currentComment.createdById !==
        user.id
      ) {
        throw new ForbiddenError(
          'Somente o autor pode editar o comentário',
        )
      }

      throw new ForbiddenError(
        'Prazo de edição de 15 minutos expirado',
      )
    }

    const updatedComment =
      await prisma.comment.findFirst({
        where: {
          id: commentId,
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
      })

    if (!updatedComment) {
      throw new NotFoundError(
        'Comentário não encontrado',
      )
    }

    await logAuditEvent({
      userId:
        user.id,

      companyId:
        dailyLog.companyId,

      action:
        'daily_log.comment_updated',

      entityType:
        'Comment',

      entityId:
        commentId,

      /*
       * O conteúdo não é salvo no log de auditoria.
       */
      payload: {
        dailyLogId,
        worksiteId:
          dailyLog.worksiteId,
        changedFields: [
          'content',
        ],
      },

      req,
    })

    return ok(
      updatedComment,
      'Comentário atualizado',
    )
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Exclui logicamente um comentário.
 *
 * Regras:
 * - o autor pode excluir o próprio comentário;
 * - SUPER_ADMIN e ADMIN_EMPRESA podem moderar comentários;
 * - o comentário deve pertencer ao diário e à empresa;
 * - a exclusão é lógica, preservando o histórico.
 */
export async function DELETE(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const {
      id: dailyLogId,
      commentId,
    } = await context.params

    const user =
      await getCurrentUser()

    const dailyLog =
      await getDailyLogOrThrow(
        dailyLogId,
      )

    await assertCommentAccess(
      user,
      dailyLog,
    )

    const comment =
      await prisma.comment.findFirst({
        where: {
          id: commentId,
          companyId:
            dailyLog.companyId,
          entityType:
            'DAILY_LOG',
          entityId:
            dailyLogId,
          isDeleted:
            false,
        },

        select: {
          id: true,
          createdById: true,
        },
      })

    if (!comment) {
      throw new NotFoundError(
        'Comentário não encontrado',
      )
    }

    const isOwner =
      comment.createdById ===
      user.id

    const canModerate =
      user.role ===
        'SUPER_ADMIN' ||
      user.role ===
        'ADMIN_EMPRESA'

    if (
      !isOwner &&
      !canModerate
    ) {
      throw new ForbiddenError(
        'Você não possui permissão para remover este comentário',
      )
    }

    const deletedAt =
      new Date()

    /*
     * A exclusão lógica é condicionada novamente ao diário,
     * tenant e estado atual do comentário.
     */
    const deleteResult =
      await prisma.comment.updateMany({
        where: {
          id: commentId,
          companyId:
            dailyLog.companyId,
          entityType:
            'DAILY_LOG',
          entityId:
            dailyLogId,
          isDeleted:
            false,
        },

        data: {
          isDeleted: true,
          deletedAt,
        },
      })

    if (
      deleteResult.count === 0
    ) {
      throw new NotFoundError(
        'Comentário não encontrado',
      )
    }

    await logAuditEvent({
      userId:
        user.id,

      companyId:
        dailyLog.companyId,

      action:
        'daily_log.comment_removed',

      entityType:
        'Comment',

      entityId:
        comment.id,

      payload: {
        dailyLogId,
        worksiteId:
          dailyLog.worksiteId,
        commentAuthorId:
          comment.createdById,
        removedByOwner:
          isOwner,
      },

      req,
    })

    return ok(
      null,
      'Comentário removido',
    )
  } catch (error) {
    return handleError(error)
  }
}