import {
  WorksiteStatus,
  type Prisma,
} from '@prisma/client'
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
  BusinessError,
  canManageWorksites,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '@/lib/permissions'
import {
  calculateWorksiteProfileCompletion,
  createWorksiteSchema,
} from '@/lib/validations/worksite'

/**
 * Converte parâmetros de paginação em números inteiros positivos.
 */
function parsePositiveInteger(
  value: string | null,
  fallback: number,
): number {
  if (!value) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback
  }

  return parsed
}

/**
 * Extrai o companyId enviado no corpo sem assumir que o JSON
 * recebido possui um formato válido.
 */
function getRequestedCompanyId(
  body: unknown,
): string | undefined {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('companyId' in body)
  ) {
    return undefined
  }

  const companyId = body.companyId

  if (typeof companyId !== 'string') {
    return undefined
  }

  const normalizedCompanyId = companyId.trim()

  return normalizedCompanyId || undefined
}

/**
 * Lista as obras acessíveis ao usuário.
 *
 * Regras:
 * - SUPER_ADMIN pode listar todas as obras;
 * - ADMIN_EMPRESA lista todas as obras da própria empresa;
 * - GESTOR_OBRA, COLABORADOR e CLIENTE_SINDICO listam somente
 *   as obras às quais estão associados;
 * - usuários não SUPER_ADMIN nunca consultam obras de outro tenant.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    const { searchParams } = req.nextUrl

    const page = parsePositiveInteger(
      searchParams.get('page'),
      1,
    )

    const perPage = Math.min(
      100,
      parsePositiveInteger(
        searchParams.get('perPage'),
        20,
      ),
    )

    const statusParam =
      searchParams.get('status')

    const city =
      searchParams.get('city')?.trim() ||
      undefined

    const search =
      searchParams.get('search')?.trim() ||
      undefined

    const incomplete =
      searchParams.get('incomplete')

    let status: WorksiteStatus | undefined

    if (statusParam) {
      const validStatuses = Object.values(
        WorksiteStatus,
      )

      if (
        !validStatuses.includes(
          statusParam as WorksiteStatus,
        )
      ) {
        throw new BusinessError(
          'Status da obra inválido',
          'INVALID_WORKSITE_STATUS',
        )
      }

      status = statusParam as WorksiteStatus
    }

    const where: Prisma.WorksiteWhereInput = {
      ...(status && {
        status,
      }),

      ...(city && {
        city: {
          contains: city,
          mode: 'insensitive',
        },
      }),

      ...(search && {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      }),

      ...(incomplete === 'true' && {
        isProfileComplete: false,
      }),

      ...(incomplete === 'false' && {
        isProfileComplete: true,
      }),
    }

    /*
     * Qualquer usuário que não seja SUPER_ADMIN precisa possuir
     * uma empresa vinculada na sessão.
     */
    if (user.role !== 'SUPER_ADMIN') {
      const companyId = user.companyId

      if (!companyId) {
        throw new ForbiddenError(
          'Usuário sem empresa vinculada',
        )
      }

      /*
       * Garante o isolamento entre empresas.
       */
      where.companyId = companyId

      /*
       * Gestor, colaborador e cliente/síndico precisam possuir uma
       * associação válida com a obra dentro da mesma empresa.
       *
       * A consulta é feita diretamente na relação WorksiteUser,
       * evitando buscar IDs separadamente.
       */
      if (
        [
          'GESTOR_OBRA',
          'COLABORADOR',
          'CLIENTE_SINDICO',
        ].includes(user.role)
      ) {
        where.worksiteUsers = {
          some: {
            userId: user.id,
            companyId,
          },
        }
      }
    }

    const [total, worksites] =
      await prisma.$transaction([
        prisma.worksite.count({
          where,
        }),

        prisma.worksite.findMany({
          where,

          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            status: true,
            startDate: true,
            endDateForecast: true,
            responsibleName: true,
            clientName: true,
            registrationMode: true,
            isProfileComplete: true,
            createdAt: true,

            group: {
              select: {
                id: true,
                name: true,
              },
            },

            _count: {
              select: {
                dailyLogs: true,
              },
            },
          },

          skip: (page - 1) * perPage,
          take: perPage,

          orderBy: {
            createdAt: 'desc',
          },
        }),
      ])

    return ok({
      data: worksites,

      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(
          total / perPage,
        ),
      },
    })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Cria uma nova obra.
 *
 * Somente SUPER_ADMIN e ADMIN_EMPRESA podem criar obras.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!canManageWorksites(user)) {
      throw new ForbiddenError(
        'Apenas administradores podem criar obras',
      )
    }

    const body: unknown = await req.json()
    const data = createWorksiteSchema.parse(body)

    const requestedCompanyId =
      getRequestedCompanyId(body)

    /*
     * ADMIN_EMPRESA sempre cria a obra na empresa presente
     * na própria sessão.
     *
     * SUPER_ADMIN pode informar a empresa no corpo da requisição.
     */
    const companyId =
      user.role === 'SUPER_ADMIN'
        ? requestedCompanyId ?? user.companyId
        : user.companyId

    if (!companyId) {
      throw new BusinessError(
        'Empresa obrigatória para criar a obra',
        'COMPANY_REQUIRED',
      )
    }

    /*
     * Confirma que a empresa realmente existe antes de tentar
     * criar a obra.
     */
    const company =
      await prisma.company.findUnique({
        where: {
          id: companyId,
        },

        include: {
          _count: {
            select: {
              worksites: {
                where: {
                  status: {
                    notIn: [
                      'CONCLUIDA',
                      'CANCELADA',
                    ],
                  },
                },
              },
            },
          },
        },
      })

    if (!company) {
      throw new NotFoundError(
        'Empresa não encontrada',
      )
    }

    /*
     * Quando um grupo é informado, ele precisa pertencer
     * à mesma empresa da nova obra.
     */
    if (data.groupId) {
      const group =
        await prisma.worksiteGroup.findFirst({
          where: {
            id: data.groupId,
            companyId,
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
     * Verifica o limite de obras ativas previsto no plano
     * contratado pela empresa.
     */
    if (
      company._count.worksites >=
      company.maxWorksites
    ) {
      throw new ConflictError(
        'Limite de obras ativas do plano atingido.',
        'WORKSITE_LIMIT_REACHED',
      )
    }

    const isProfileComplete =
      calculateWorksiteProfileCompletion({
        name: data.name,
        status: data.status,
        groupId: data.groupId || null,
        responsibleName:
          data.responsibleName || null,
        startDate: data.startDate || null,
        endDateForecast:
          data.endDateForecast || null,
        registrationMode:
          data.registrationMode,
      })

    const worksite =
      await prisma.worksite.create({
        data: {
          companyId,
          name: data.name,
          status: data.status,
          registrationMode:
            data.registrationMode,
          isProfileComplete,
          hasTaskList:
            data.hasTaskList ?? false,
          groupId:
            data.groupId ?? null,

          address:
            data.address || null,

          neighborhood:
            data.neighborhood || null,

          city:
            data.city || null,

          state:
            data.state || null,

          cep:
            data.cep || null,

          artNumber:
            data.artNumber || null,

          responsibleName:
            data.responsibleName || null,

          responsibleCrea:
            data.responsibleCrea || null,

          startDate:
            data.startDate
              ? new Date(data.startDate)
              : null,

          endDateForecast:
            data.endDateForecast
              ? new Date(
                  data.endDateForecast,
                )
              : null,

          description:
            data.description || null,

          clientName:
            data.clientName || null,

          contractNumber:
            data.contractNumber || null,

          contractType:
            data.contractType || null,

          totalArea:
            data.totalArea ?? null,

          createdById: user.id,
        },
      })

    await logAuditEvent({
      userId: user.id,
      companyId,
      action: 'worksite.created',
      entityType: 'Worksite',
      entityId: worksite.id,

      payload: {
        name: worksite.name,
        status: worksite.status,
        registrationMode:
          worksite.registrationMode,
        isProfileComplete,
      },

      req,
    })

    return created(
      worksite,
      'Obra criada com sucesso',
    )
  } catch (error) {
    return handleError(error)
  }
}