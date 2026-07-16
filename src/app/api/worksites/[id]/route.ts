import type { NextRequest } from 'next/server'

import { handleError, ok } from '@/lib/api-response'
import { logAuditEvent } from '@/lib/audit'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import {
  assertWorksiteAccess,
  BusinessError,
  canManageWorksites,
  ForbiddenError,
  NotFoundError,
} from '@/lib/permissions'
import {
  calculateWorksiteProfileCompletion,
  updateWorksiteSchema,
} from '@/lib/validations/worksite'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

/**
 * Retorna o detalhe de uma obra.
 *
 * Regras:
 * - SUPER_ADMIN pode visualizar qualquer obra existente;
 * - ADMIN_EMPRESA pode visualizar obras da própria empresa;
 * - gestor, colaborador e cliente precisam estar associados à obra;
 * - colaborador e cliente não recebem a lista interna de usuários da obra.
 */
export async function GET(
  _req: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params
    const user = await getCurrentUser()

    await assertWorksiteAccess(user, id)

    /*
     * Somente perfis administrativos e gestores podem visualizar
     * os usuários internos associados à obra.
     *
     * Isso evita expor e-mail, perfil e avatar da equipe para
     * colaboradores e clientes/síndicos.
     */
    const canViewWorksiteUsers =
      canManageWorksites(user) ||
      user.role === 'GESTOR_OBRA'

    const worksite = await prisma.worksite.findUnique({
      where: {
        id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },

        group: {
          select: {
            id: true,
            name: true,
          },
        },

        worksiteUsers: canViewWorksiteUsers
          ? {
              /*
               * Para usuários que não sejam SUPER_ADMIN, limita também
               * as associações ao tenant presente na sessão.
               */
              where:
                user.role === 'SUPER_ADMIN'
                  ? undefined
                  : {
                      companyId: user.companyId,
                    },

              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    avatarUrl: true,
                  },
                },
              },
            }
          : false,

        _count: {
          select: {
            dailyLogs: true,
          },
        },
      },
    })

    /*
     * A obra pode ter sido removida entre a validação de acesso
     * e a consulta dos dados.
     */
    if (!worksite) {
      throw new NotFoundError('Obra não encontrada')
    }

    return ok(worksite)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Atualiza uma obra.
 *
 * Somente SUPER_ADMIN e ADMIN_EMPRESA podem executar esta operação.
 */
export async function PATCH(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params
    const user = await getCurrentUser()

    if (!canManageWorksites(user)) {
      throw new ForbiddenError(
        'Você não possui permissão para editar obras',
      )
    }

    /*
     * Também valida:
     * - existência da obra;
     * - tenant do usuário;
     * - acesso administrativo à obra.
     *
     * Para obra de outra empresa, retorna 404 para evitar revelar
     * que o recurso existe.
     */
    await assertWorksiteAccess(user, id)

    const existing = await prisma.worksite.findUnique({
      where: {
        id,
      },
    })

    if (!existing) {
      throw new NotFoundError('Obra não encontrada')
    }

    const body: unknown = await req.json()
    const data = updateWorksiteSchema.parse(body)

    /*
     * Quando um grupo é informado, ele precisa pertencer à mesma
     * empresa da obra que está sendo atualizada.
     */
    if (data.groupId) {
      const group = await prisma.worksiteGroup.findFirst({
        where: {
          id: data.groupId,
          companyId: existing.companyId,
        },
        select: {
          id: true,
        },
      })

      if (!group) {
        throw new BusinessError(
          'Grupo não encontrado nesta empresa',
          'GROUP_NOT_FOUND',
        )
      }
    }

    /*
     * Combina os dados atuais com os novos valores para recalcular
     * corretamente o estado de cadastro completo.
     */
    const mergedName =
      data.name ?? existing.name

    const mergedStatus =
      data.status ?? existing.status

    const mergedGroupId =
      data.groupId !== undefined
        ? data.groupId
        : existing.groupId

    const mergedResponsible =
      data.responsibleName !== undefined
        ? data.responsibleName
        : existing.responsibleName

    const mergedStartDate =
      data.startDate !== undefined
        ? data.startDate
        : existing.startDate

    const mergedEndDate =
      data.endDateForecast !== undefined
        ? data.endDateForecast
        : existing.endDateForecast

    const mergedMode =
      data.registrationMode ??
      existing.registrationMode

    const isProfileComplete =
      calculateWorksiteProfileCompletion({
        name: mergedName,
        status: mergedStatus,
        groupId: mergedGroupId,
        responsibleName: mergedResponsible,
        startDate: mergedStartDate,
        endDateForecast: mergedEndDate,
        registrationMode: mergedMode,
      })

    const updated = await prisma.worksite.update({
      where: {
        id,
      },
      data: {
        ...(data.name !== undefined && {
          name: data.name,
        }),

        ...(data.status !== undefined && {
          status: data.status,
        }),

        ...(data.registrationMode !== undefined && {
          registrationMode: data.registrationMode,
        }),

        ...(data.responsibleName !== undefined && {
          responsibleName:
            data.responsibleName || null,
        }),

        ...(data.startDate !== undefined && {
          startDate: data.startDate
            ? new Date(data.startDate)
            : null,
        }),

        ...(data.endDateForecast !== undefined && {
          endDateForecast: data.endDateForecast
            ? new Date(data.endDateForecast)
            : null,
        }),

        ...(data.address !== undefined && {
          address: data.address || null,
        }),

        ...(data.neighborhood !== undefined && {
          neighborhood:
            data.neighborhood || null,
        }),

        ...(data.city !== undefined && {
          city: data.city || null,
        }),

        ...(data.state !== undefined && {
          state: data.state || null,
        }),

        ...(data.cep !== undefined && {
          cep: data.cep || null,
        }),

        ...(data.artNumber !== undefined && {
          artNumber: data.artNumber || null,
        }),

        ...(data.responsibleCrea !== undefined && {
          responsibleCrea:
            data.responsibleCrea || null,
        }),

        ...(data.description !== undefined && {
          description: data.description || null,
        }),

        ...(data.clientName !== undefined && {
          clientName: data.clientName || null,
        }),

        ...(data.contractNumber !== undefined && {
          contractNumber:
            data.contractNumber || null,
        }),

        ...(data.contractType !== undefined && {
          contractType: data.contractType || null,
        }),

        ...(data.totalArea !== undefined && {
          totalArea: data.totalArea ?? null,
        }),

        ...(data.groupId !== undefined && {
          groupId: data.groupId || null,
        }),

        ...(data.hasTaskList !== undefined && {
          hasTaskList: data.hasTaskList,
        }),

        isProfileComplete,
      },
    })

    await logAuditEvent({
      userId: user.id,
      companyId: existing.companyId,
      action: 'worksite.updated',
      entityType: 'Worksite',
      entityId: id,
      payload: {
        ...(data as Record<string, unknown>),
        isProfileComplete,
      },
      req,
    })

    return ok(
      updated,
      'Obra atualizada com sucesso',
    )
  } catch (error) {
    return handleError(error)
  }
}