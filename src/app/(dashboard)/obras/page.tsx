import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { MapPin, User, Calendar, AlertCircle, HardHat } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { WorksiteFilters } from '@/components/domain/worksite/WorksiteFilters'
import { formatDate } from '@/lib/utils'
import type { WorksiteStatus } from '@prisma/client'

export const metadata: Metadata = { title: 'Obras' }

const STATUS_LABELS: Record<WorksiteStatus, string> = {
  PLANEJAMENTO: 'Planejamento',
  EM_ANDAMENTO: 'Em andamento',
  PAUSADA: 'Pausada',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
}

const STATUS_VARIANTS: Record<WorksiteStatus, 'info' | 'success' | 'warning' | 'muted' | 'destructive'> = {
  PLANEJAMENTO: 'info',
  EM_ANDAMENTO: 'success',
  PAUSADA: 'warning',
  CONCLUIDA: 'muted',
  CANCELADA: 'destructive',
}

interface SearchParams {
  q?: string
  status?: string
  groupId?: string
}

export default async function ObrasPage(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const session = await auth()
  const user = session!.user

  let worksiteIds: string[] | undefined
  if (['GESTOR_OBRA', 'COLABORADOR'].includes(user.role)) {
    const assocs = await prisma.worksiteUser.findMany({
      where: { userId: user.id },
      select: { worksiteId: true },
    })
    worksiteIds = assocs.map(a => a.worksiteId)
  }

  const [worksites, groups] = await Promise.all([
    prisma.worksite.findMany({
      where: {
        companyId: user.role !== 'SUPER_ADMIN' ? (user.companyId ?? undefined) : undefined,
        ...(worksiteIds && { id: { in: worksiteIds } }),
        ...(searchParams.status && { status: searchParams.status as WorksiteStatus }),
        ...(searchParams.groupId && { groupId: searchParams.groupId }),
        ...(searchParams.q && {
          name: { contains: searchParams.q, mode: 'insensitive' as const },
        }),
      },
      include: {
        _count: { select: { dailyLogs: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.worksiteGroup.findMany({
      where: { companyId: user.companyId ?? undefined },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Obras</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {worksites.length} {worksites.length === 1 ? 'obra' : 'obras'} encontradas
          </p>
        </div>
      </div>

      {/* Filtros e busca */}
      <WorksiteFilters
        groups={groups}
        currentStatus={searchParams.status}
        currentGroupId={searchParams.groupId}
        currentQ={searchParams.q}
      />

      {worksites.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <HardHat className="w-8 h-8 text-gray-400" aria-hidden />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {searchParams.q || searchParams.status || searchParams.groupId
              ? 'Nenhuma obra encontrada com esses filtros'
              : 'Nenhuma obra cadastrada'}
          </h3>
          <p className="text-gray-500 text-sm">
            {searchParams.q || searchParams.status || searchParams.groupId
              ? 'Tente remover ou alterar os filtros.'
              : 'Clique em + ADICIONAR para criar a primeira obra.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {worksites.map(ws => (
            <Link key={ws.id} href={`/obras/${ws.id}`}>
              <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer h-full">
                <CardContent className="p-0">
                  {/* Placeholder image / color bar */}
                  <div className={`h-2 rounded-t-lg ${
                    ws.status === 'EM_ANDAMENTO' ? 'bg-green-500' :
                    ws.status === 'PLANEJAMENTO' ? 'bg-blue-400' :
                    ws.status === 'PAUSADA' ? 'bg-amber-400' :
                    ws.status === 'CONCLUIDA' ? 'bg-gray-400' : 'bg-red-400'
                  }`} />

                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{ws.name}</h3>
                      <Badge variant={STATUS_VARIANTS[ws.status]} className="flex-shrink-0 text-xs">
                        {STATUS_LABELS[ws.status]}
                      </Badge>
                    </div>

                    {!ws.isProfileComplete && (
                      <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" aria-hidden />
                        <span className="text-xs font-medium">Cadastro incompleto</span>
                      </div>
                    )}

                    <div className="space-y-1 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 flex-shrink-0" aria-hidden />
                        <span className="truncate">
                          {ws.city && ws.state ? `${ws.city} — ${ws.state}` : 'Local não informado'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 flex-shrink-0" aria-hidden />
                        <span className="truncate">{ws.responsibleName ?? 'Responsável não informado'}</span>
                      </div>
                      {ws.startDate && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 flex-shrink-0" aria-hidden />
                          <span>Início: {formatDate(ws.startDate)}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-2">
                        <span>{ws._count.dailyLogs} {ws._count.dailyLogs === 1 ? 'diário' : 'diários'}</span>
                        {ws.group && <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs">{ws.group.name}</span>}
                      </div>
                      {ws.endDateForecast && <span>Prev.: {formatDate(ws.endDateForecast)}</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
