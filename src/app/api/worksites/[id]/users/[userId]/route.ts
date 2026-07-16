import type { NextRequest } from 'next/server'

import { handleError, ok } from '@/lib/api-response'
import { logAuditEvent } from '@/lib/audit'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import {
  assertWorksiteAccess,
  canManageWorksites,
  ForbiddenError,
  NotFoundError,
} from '@/lib/permissions'

type RouteContext = {
  params: Promise<{
    id: string
    userId: string
  }>
}

/**
 * Remove a associação de um usuário com uma obra.
 *
 * Regras:
 * - somente SUPER_ADMIN e ADMIN_EMPRESA podem remover associações;
 * - ADMIN_EMPRESA só pode alterar obras da própria empresa;
 * - a associação deve pertencer à obra e ao mesmo tenant;
 * - a remoção é registrada no log de auditoria.
 */
export async function DELETE(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const {
      id: worksiteId,
      userId: targetUserId,
    } = await context.params

    const currentUser = await getCurrentUser()

    if (!canManageWorksites(currentUser)) {
      throw new ForbiddenError(
        'Você não possui permissão para remover usuários da obra',
      )
    }

    /*
     * Valida a existência da obra e o acesso ao tenant.
     *
     * ADMIN_EMPRESA recebe 404 ao tentar acessar uma obra
     * pertencente a outra empresa.
     */
    await assertWorksiteAccess(
      currentUser,
      worksiteId,
    )

    const worksite = await prisma.worksite.findUnique({
      where: {
        id: worksiteId,
      },
      select: {
        id: true,
        companyId: true,
      },
    })

    if (!worksite) {
      throw new NotFoundError(
        'Obra não encontrada',
      )
    }

    /*
     * Localiza a associação validando também o companyId.
     *
     * Isso evita operar sobre uma associação inconsistente
     * ou pertencente a outro tenant.
     */
    const association =
      await prisma.worksiteUser.findFirst({
        where: {
          worksiteId,
          userId: targetUserId,
          companyId: worksite.companyId,
        },
        select: {
          id: true,
          userId: true,
          role: true,
          assignedAt: true,
        },
      })

    if (!association) {
      throw new NotFoundError(
        'Associação não encontrada',
      )
    }

    /*
     * A exclusão utiliza o ID da associação que acabou
     * de ser validada, em vez de confiar apenas nos parâmetros
     * recebidos pela URL.
     */
    await prisma.worksiteUser.delete({
      where: {
        id: association.id,
      },
    })

    await logAuditEvent({
      userId: currentUser.id,
      companyId: worksite.companyId,
      action: 'worksite.user_removed',
      entityType: 'WorksiteUser',
      entityId: association.id,
      payload: {
        worksiteId,
        targetUserId: association.userId,
        previousWorksiteRole: association.role,
        assignedAt: association.assignedAt,
      },
      req,
    })

    return ok(
      null,
      'Usuário removido da obra',
    )
  } catch (error) {
    return handleError(error)
  }
}