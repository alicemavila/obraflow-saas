import {
  DailyLogStatus,
  Prisma,
  type WorksiteStatus,
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
  assertWorksiteAccess,
  BusinessError,
  canCreateDailyLog,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  worksiteAcceptsDailyLog,
} from '@/lib/permissions'
import { createDailyLogSchema } from '@/lib/validations/daily-log'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const ONE_DAY_IN_MILLISECONDS = 86_400_000

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
 * Converte uma data no formato YYYY-MM-DD para UTC.
 *
 * Também impede datas inválidas, como 2026-02-30.
 */
function parseDateOnly(
  value: string,
  fieldName: string,
): Date {
  if (!DATE_ONLY_PATTERN.test(value)) {
    throw new BusinessError(
      `${fieldName} deve estar no formato YYYY-MM-DD`,
      'INVALID_DATE_FORMAT',
    )
  }

  const parsedDate = new Date(
    `${value}T00:00:00.000Z`,
  )

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== value
  ) {
    throw new BusinessError(
      `${fieldName} contém uma data inválida`,
      'INVALID_DATE',
    )
  }

  return parsedDate
}

/**
 * Valida o filtro de status recebido na URL.
 */
function parseDailyLogStatus(
  value: string | null,
): DailyLogStatus | undefined {
  if (!value) {
    return undefined
  }

  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return undefined
  }

  const validStatuses = Object.values(
    DailyLogStatus,
  )

  if (
    !validStatuses.includes(
      normalizedValue as DailyLogStatus,
    )
  ) {
    throw new BusinessError(
      'Status do diário inválido',
      'INVALID_DAILY_LOG_STATUS',
    )
  }

  return normalizedValue as DailyLogStatus
}

/**
 * Busca somente os dados da obra necessários para as operações
 * desta rota.
 */
async function getWorksiteOrThrow(
  worksiteId: string,
): Promise<{
  id: string
  companyId: string
  status: WorksiteStatus
}> {
  const worksite =
    await prisma.worksite.findUnique({
      where: {
        id: worksiteId,
      },

      select: {
        id: true,
        companyId: true,
        status: true,
      },
    })

  if (!worksite) {
    throw new NotFoundError(
      'Obra não encontrada',
    )
  }

  return worksite
}

/**
 * Lista os diários de uma obra.
 *
 * Regras:
 * - SUPER_ADMIN pode consultar qualquer obra existente;
 * - ADMIN_EMPRESA consulta obras da própria empresa;
 * - gestor, colaborador e cliente precisam estar associados;
 * - CLIENTE_SINDICO visualiza somente diários aprovados;
 * - a consulta sempre filtra também pelo tenant da obra.
 */
export async function GET(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: worksiteId } =
      await context.params

    const user = await getCurrentUser()

    /*
     * Garante existência da obra, isolamento entre empresas
     * e associação obrigatória para os perfis operacionais.
     */
    await assertWorksiteAccess(
      user,
      worksiteId,
    )

    const worksite =
      await getWorksiteOrThrow(worksiteId)

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

    const requestedStatus =
      parseDailyLogStatus(
        searchParams.get('status'),
      )

    const dateFromValue =
      searchParams.get('dateFrom')?.trim() ||
      undefined

    const dateToValue =
      searchParams.get('dateTo')?.trim() ||
      undefined

    const dateFrom = dateFromValue
      ? parseDateOnly(
          dateFromValue,
          'dateFrom',
        )
      : undefined

    const dateTo = dateToValue
      ? parseDateOnly(
          dateToValue,
          'dateTo',
        )
      : undefined

    if (
      dateFrom &&
      dateTo &&
      dateFrom.getTime() > dateTo.getTime()
    ) {
      throw new BusinessError(
        'dateFrom não pode ser posterior a dateTo',
        'INVALID_DATE_RANGE',
      )
    }

    /*
     * Inclui todo o dia informado em dateTo.
     */
    const dateToEndOfDay = dateTo
      ? new Date(
          dateTo.getTime() +
            ONE_DAY_IN_MILLISECONDS -
            1,
        )
      : undefined

    /*
     * CLIENTE_SINDICO não pode escolher outro status.
     * Mesmo enviando status=RASCUNHO, o backend força APROVADO.
     */
    const statusFilter =
      user.role === 'CLIENTE_SINDICO'
        ? DailyLogStatus.APROVADO
        : requestedStatus

    const where: Prisma.DailyLogWhereInput = {
      worksiteId,
      companyId: worksite.companyId,

      ...(statusFilter && {
        status: statusFilter,
      }),

      ...((dateFrom || dateToEndOfDay) && {
        date: {
          ...(dateFrom && {
            gte: dateFrom,
          }),

          ...(dateToEndOfDay && {
            lte: dateToEndOfDay,
          }),
        },
      }),
    }

    const [total, dailyLogs] =
      await prisma.$transaction([
        prisma.dailyLog.count({
          where,
        }),

        prisma.dailyLog.findMany({
          where,

          select: {
            id: true,
            date: true,
            status: true,
            weatherMorning: true,
            weatherAfternoon: true,
            tempMin: true,
            tempMax: true,
            workedHours: true,
            createdAt: true,
            approvedAt: true,

            createdBy: {
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

            _count: {
              select: {
                activities: true,
                laborRecords: true,
                occurrences: true,
              },
            },
          },

          skip: (page - 1) * perPage,
          take: perPage,

          orderBy: {
            date: 'desc',
          },
        }),
      ])

    return ok({
      data: dailyLogs,

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
 * Cria um diário em uma obra.
 *
 * Regras:
 * - CLIENTE_SINDICO não pode criar diário;
 * - gestor e colaborador precisam estar associados à obra;
 * - a obra precisa estar em andamento;
 * - existe apenas um diário por obra e data;
 * - o tenant vem sempre da obra autorizada, nunca do frontend.
 */
export async function POST(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: worksiteId } =
      await context.params

    const user = await getCurrentUser()

    if (!canCreateDailyLog(user)) {
      throw new ForbiddenError(
        'Você não possui permissão para criar diários',
      )
    }

    /*
     * Impede que gestor ou colaborador criem diário em outra
     * obra da mesma empresa apenas conhecendo o identificador.
     */
    await assertWorksiteAccess(
      user,
      worksiteId,
    )

    const worksite =
      await getWorksiteOrThrow(worksiteId)

    if (
      !worksiteAcceptsDailyLog(
        worksite.status,
      )
    ) {
      throw new BusinessError(
        'Obra não está em andamento',
        'WORKSITE_INACTIVE',
      )
    }

    const body: unknown = await req.json()

    const data =
      createDailyLogSchema.parse(body)

    const dailyLogDate =
      parseDateOnly(
        data.date,
        'date',
      )

    try {
      /*
       * A restrição única do banco é a proteção definitiva
       * contra duas requisições simultâneas para a mesma data.
       */
      const dailyLog =
        await prisma.dailyLog.create({
          data: {
            worksiteId,
            companyId: worksite.companyId,
            date: dailyLogDate,

            weatherMorning:
              data.weatherMorning,

            weatherAfternoon:
              data.weatherAfternoon,

            weatherEvening:
              data.weatherEvening,

            tempMin:
              data.tempMin,

            tempMax:
              data.tempMax,

            workedHours:
              data.workedHours,

            notes:
              data.notes,

            status:
              DailyLogStatus.RASCUNHO,

            createdById:
              user.id,
          },
        })

      await logAuditEvent({
        userId: user.id,
        companyId: worksite.companyId,
        action: 'daily_log.created',
        entityType: 'DailyLog',
        entityId: dailyLog.id,

        payload: {
          date: data.date,
          worksiteId,
        },

        req,
      })

      return created(
        dailyLog,
        'Diário criado com sucesso',
      )
    } catch (error) {
      /*
       * P2002 representa violação de chave única no Prisma.
       *
       * Isso cobre inclusive duas requisições concorrentes
       * tentando criar o mesmo diário.
       */
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictError(
          `Já existe um diário para ${data.date} nesta obra`,
          'DAILY_LOG_ALREADY_EXISTS',
        )
      }

      throw error
    }
  } catch (error) {
    return handleError(error)
  }
}