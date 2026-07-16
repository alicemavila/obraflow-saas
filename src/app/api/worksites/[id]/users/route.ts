import { UserRole } from '@prisma/client'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

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
  canManageWorksites,
  ConflictError,
  ForbiddenError,
  isGestorObra,
  NotFoundError,
} from '@/lib/permissions'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

const WORKSITE_ASSIGNABLE_ROLES: UserRole[] = [
  'GESTOR_OBRA',
  'COLABORADOR',
  'CLIENTE_SINDICO',
]

const addUserSchema = z.object({
  userId: z
    .string()
    .uuid('Identificador de usuário inválido'),

  role: z
    .nativeEnum(UserRole)
    .refine(
      (role) =>
        WORKSITE_ASSIGNABLE_ROLES.includes(role),
      {
        message: 'Perfil inválido para associação à obra',
      },
    ),
})

/**
 * Lista os usuários associados a uma obra.
 *
 * Regras:
 * - SUPER_ADMIN pode visualizar usuários de qualquer obra;
 * - ADMIN_EMPRESA pode visualizar usuários das obras da sua empresa;
 * - GESTOR_OBRA pode visualizar usuários somente das obras
 *   às quais está associado;
 * - COLABORADOR e CLIENTE_SINDICO não podem acessar a lista interna.
 */
export async function GET(
  _req: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: worksiteId } =
      await context.params

    const currentUser =
      await getCurrentUser()

    const canViewWorksiteUsers =
      canManageWorksites(currentUser) ||
      isGestorObra(currentUser)

    if (!canViewWorksiteUsers) {
      throw new ForbiddenError(
        'Você não possui permissão para visualizar os usuários desta obra',
      )
    }

    /*
     * Esta validação garante:
     * - existência da obra;
     * - isolamento entre empresas;
     * - associação obrigatória para GESTOR_OBRA.
     *
     * Quando não há acesso, retorna 404 para não revelar
     * a existência de obras de outro tenant.
     */
    await assertWorksiteAccess(
      currentUser,
      worksiteId,
    )

    const worksite =
      await prisma.worksite.findUnique({
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
     * O filtro por companyId impede que uma associação inconsistente
     * ou pertencente a outro tenant seja retornada.
     */
    const associations =
      await prisma.worksiteUser.findMany({
        where: {
          worksiteId,
          companyId: worksite.companyId,
        },

        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatarUrl: true,
              isActive: true,
            },
          },
        },

        orderBy: {
          assignedAt: 'asc',
        },
      })

    const users = associations.map(
      (association) => ({
        ...association.user,
        worksiteRole: association.role,
        assignedAt: association.assignedAt,
      }),
    )

    return ok(users)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Associa um usuário a uma obra.
 *
 * Somente SUPER_ADMIN e ADMIN_EMPRESA podem executar esta operação.
 */
export async function POST(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: worksiteId } =
      await context.params

    const currentUser =
      await getCurrentUser()

    if (!canManageWorksites(currentUser)) {
      throw new ForbiddenError(
        'Você não possui permissão para adicionar usuários à obra',
      )
    }

    /*
     * SUPER_ADMIN pode acessar qualquer obra existente.
     * ADMIN_EMPRESA pode acessar somente obras da própria empresa.
     */
    await assertWorksiteAccess(
      currentUser,
      worksiteId,
    )

    const worksite =
      await prisma.worksite.findUnique({
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

    const body: unknown = await req.json()

    const {
      userId,
      role,
    } = addUserSchema.parse(body)

    /*
     * O usuário precisa pertencer à mesma empresa da obra.
     *
     * Não utilizamos companyId enviado pelo frontend.
     * A empresa é obtida diretamente da obra já autorizada.
     */
    const targetUser =
      await prisma.user.findFirst({
        where: {
          id: userId,
          companyId: worksite.companyId,
        },

        select: {
          id: true,
          isActive: true,
        },
      })

    if (!targetUser) {
      throw new NotFoundError(
        'Usuário não encontrado nesta empresa',
      )
    }

    if (!targetUser.isActive) {
      throw new BusinessError(
        'Não é possível adicionar um usuário inativo à obra',
        'USER_INACTIVE',
      )
    }

    const existingAssociation =
      await prisma.worksiteUser.findFirst({
        where: {
          worksiteId,
          userId,
          companyId: worksite.companyId,
        },

        select: {
          id: true,
        },
      })

    if (existingAssociation) {
      throw new ConflictError(
        'Usuário já associado a esta obra',
        'WORKSITE_USER_ALREADY_EXISTS',
      )
    }

    const association =
      await prisma.worksiteUser.create({
        data: {
          worksiteId,
          userId,
          companyId: worksite.companyId,
          role,
          assignedById: currentUser.id,
        },

        select: {
          id: true,
          worksiteId: true,
          userId: true,
          companyId: true,
          role: true,
          assignedAt: true,
          assignedById: true,
        },
      })

    /*
     * Alterações de acesso são eventos sensíveis e devem
     * permanecer registradas na auditoria.
     */
    await logAuditEvent({
      userId: currentUser.id,
      companyId: worksite.companyId,
      action: 'worksite.user_added',
      entityType: 'WorksiteUser',
      entityId: association.id,

      payload: {
        worksiteId,
        targetUserId: userId,
        worksiteRole: role,
      },

      req,
    })

    return created(
      association,
      'Usuário adicionado à obra',
    )
  } catch (error) {
    return handleError(error)
  }
}