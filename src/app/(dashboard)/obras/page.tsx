import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Plus, MapPin, User, Calendar, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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

export default async function ObrasPage() {
  const session = await auth()
  const user = session!.user
  const canCreate = ['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)

  let worksiteIds: string[] | undefined
  if (['GESTOR_OBRA', 'COLABORADOR'].includes(user.role)) {
    const assocs = await prisma.worksiteUser.findMany({
      where: { userId: user.id },
      select: { worksiteId: true },
    })
    worksiteIds = assocs.map(a => a.worksiteId)
  }

  const worksites = await prisma.worksite.findMany({
    where: {
      companyId: user.role !== 'SUPER_ADMIN' ? (user.companyId ?? undefined) : undefined,
      ...(worksiteIds && { id: { in: worksiteIds } }),
    },
    include: {
      _count: { select: { dailyLogs: true } },
      group: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Obras</h1>
          <p className="text-gray-500 text-sm mt-1">
            {worksites.length} {worksites.length === 1 ? 'obra' : 'obras'} encontradas
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/obras/nova">
              <Plus className="w-4 h-4 mr-2" aria-hidden />
              Nova obra
            </Link>
          </Button>
        )}
      </div>

      {worksites.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-gray-400" aria-hidden />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Nenhuma obra cadastrada</h3>
          <p className="text-gray-500 text-sm mb-4">Comece cadastrando a primeira obra da empresa.</p>
          {canCreate && (
            <Button asChild>
              <Link href="/obras/nova">
                <Plus className="w-4 h-4 mr-2" aria-hidden />
                Nova obra
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {worksites.map(ws => (
            <Link key={ws.id} href={`/obras/${ws.id}`}>
              <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer h-full">
                <CardContent className="p-5 space-y-3">
                  {/* Nome + status */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight">{ws.name}</h3>
                    <Badge variant={STATUS_VARIANTS[ws.status]} className="flex-shrink-0">
                      {STATUS_LABELS[ws.status]}
                    </Badge>
                  </div>

                  {/* Badge cadastro incompleto */}
                  {!ws.isProfileComplete && (
                    <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
                      <span className="text-xs font-medium">Cadastro incompleto</span>
                    </div>
                  )}

                  {/* Detalhes */}
                  <div className="space-y-1.5 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
                      <span className="truncate">
                        {ws.city && ws.state
                          ? `${ws.city} — ${ws.state}`
                          : 'Local não informado'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
                      <span className="truncate">
                        {ws.responsibleName ?? 'Responsável não informado'}
                      </span>
                    </div>
                    {ws.startDate ? (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
                        <span>Início: {formatDate(ws.startDate)}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Rodapé */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <span>{ws._count.dailyLogs} {ws._count.dailyLogs === 1 ? 'diário' : 'diários'}</span>
                      {ws.group && <span>· {ws.group.name}</span>}
                    </div>
                    {ws.endDateForecast && <span>Prev.: {formatDate(ws.endDateForecast)}</span>}
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
