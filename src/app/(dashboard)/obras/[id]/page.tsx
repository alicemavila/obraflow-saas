import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Plus, MapPin, User, Calendar, ClipboardList, AlertCircle, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WorksiteStatusControl } from '@/components/domain/worksite/WorksiteStatusControl'
import { formatDate } from '@/lib/utils'
import type { WorksiteStatus } from '@prisma/client'

export const metadata: Metadata = { title: 'Detalhe da Obra' }

const STATUS_LABELS: Record<WorksiteStatus, string> = {
  PLANEJAMENTO: 'Planejamento', EM_ANDAMENTO: 'Em andamento',
  PAUSADA: 'Pausada', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada',
}
const STATUS_VARIANTS: Record<WorksiteStatus, 'info' | 'success' | 'warning' | 'muted' | 'destructive'> = {
  PLANEJAMENTO: 'info', EM_ANDAMENTO: 'success', PAUSADA: 'warning', CONCLUIDA: 'muted', CANCELADA: 'destructive',
}

export default async function ObraDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth()
  const user = session!.user

  const worksite = await prisma.worksite.findFirst({
    where: {
      id: params.id,
      ...(user.role !== 'SUPER_ADMIN' && { companyId: user.companyId ?? undefined }),
    },
    include: {
      worksiteUsers: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      group: { select: { id: true, name: true } },
      _count: { select: { dailyLogs: true } },
      createdBy: { select: { name: true } },
    },
  })

  if (!worksite) notFound()

  const canManage = ['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)

  const recentLogs = await prisma.dailyLog.findMany({
    where: { worksiteId: params.id },
    select: { id: true, date: true, status: true, createdBy: { select: { name: true } } },
    orderBy: { date: 'desc' },
    take: 5,
  })

  const ROLE_LABELS: Record<string, string> = {
    GESTOR_OBRA: 'Gestor', COLABORADOR: 'Colaborador',
    CLIENTE_SINDICO: 'Cliente/Síndico', ADMIN_EMPRESA: 'Admin', SUPER_ADMIN: 'Super Admin',
  }
  const LOG_LABELS: Record<string, string> = {
    RASCUNHO: 'Rascunho', SUBMETIDO: 'Aguardando', APROVADO: 'Aprovado', REJEITADO: 'Rejeitado',
  }
  const LOG_VARIANTS: Record<string, string> = {
    RASCUNHO: 'muted', SUBMETIDO: 'warning', APROVADO: 'success', REJEITADO: 'destructive',
  }

  // Build address string safely
  const addressParts = [
    worksite.address,
    worksite.neighborhood,
    worksite.city && worksite.state ? `${worksite.city} - ${worksite.state}` : worksite.city ?? worksite.state,
  ].filter(Boolean)
  const addressDisplay = addressParts.length > 0 ? addressParts.join(', ') : null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/obras" className="flex items-center gap-1 hover:text-blue-700">
          <ChevronLeft className="w-4 h-4" aria-hidden />Obras
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate">{worksite.name}</span>
      </div>

      {/* Aviso de cadastro incompleto */}
      {!worksite.isProfileComplete && canManage && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden />
          <div className="flex-1">
            <p className="font-medium">Cadastro incompleto</p>
            <p className="text-amber-700 mt-0.5">
              Complete os dados técnicos, responsável e cronograma para finalizar o cadastro da obra.
            </p>
          </div>
          <Button size="sm" variant="outline" asChild className="flex-shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100">
            <Link href={`/obras/${worksite.id}/editar`}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" aria-hidden />
              Completar cadastro
            </Link>
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{worksite.name}</h1>
            <Badge variant={STATUS_VARIANTS[worksite.status]}>{STATUS_LABELS[worksite.status]}</Badge>
            {!worksite.isProfileComplete && (
              <Badge variant="warning" className="text-xs">Cadastro incompleto</Badge>
            )}
          </div>
          {worksite.clientName && (
            <p className="text-gray-500 text-sm mt-1">Contratante: {worksite.clientName}</p>
          )}
          {worksite.group && (
            <p className="text-gray-400 text-xs mt-0.5">Grupo: {worksite.group.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {canManage && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/obras/${worksite.id}/editar`}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" aria-hidden />
                Editar
              </Link>
            </Button>
          )}
          {canManage && <WorksiteStatusControl worksiteId={worksite.id} currentStatus={worksite.status} />}
          {worksite.status === 'EM_ANDAMENTO' && (
            <Button asChild size="sm">
              <Link href={`/obras/${worksite.id}/diarios/novo`}>
                <Plus className="w-4 h-4 mr-1" aria-hidden />
                Novo diário
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Informações da obra</CardTitle></CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              {[
                addressDisplay && {
                  icon: MapPin, label: 'Endereço', value: addressDisplay,
                },
                worksite.responsibleName && {
                  icon: User, label: 'Responsável',
                  value: `${worksite.responsibleName}${worksite.responsibleCrea ? ` (${worksite.responsibleCrea})` : ''}`,
                },
                worksite.startDate && {
                  icon: Calendar, label: 'Início', value: formatDate(worksite.startDate),
                },
                worksite.endDateForecast && {
                  icon: Calendar, label: 'Previsão', value: formatDate(worksite.endDateForecast),
                },
                worksite.artNumber && {
                  icon: ClipboardList, label: 'ART/RRT', value: worksite.artNumber,
                },
                worksite.contractNumber && {
                  icon: ClipboardList, label: 'Contrato', value: worksite.contractNumber,
                },
                worksite.contractType && {
                  icon: ClipboardList, label: 'Tipo contrato', value: worksite.contractType,
                },
              ].filter(Boolean).map(row => {
                const r = row as { icon: React.ElementType; label: string; value: string }
                return (
                  <div key={r.label} className="flex items-start gap-2">
                    <r.icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" aria-hidden />
                    <span className="text-gray-500 w-24 flex-shrink-0">{r.label}</span>
                    <span className="text-gray-900">{r.value}</span>
                  </div>
                )
              })}

              {/* Empty state for incomplete */}
              {!worksite.responsibleName && !addressDisplay && !worksite.startDate && (
                <p className="text-gray-400 text-xs italic py-1">
                  Dados técnicos não preenchidos.{' '}
                  {canManage && (
                    <Link href={`/obras/${worksite.id}/editar`} className="text-blue-600 hover:underline">
                      Completar cadastro
                    </Link>
                  )}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent logs */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Diários recentes</CardTitle>
              <Link href={`/obras/${worksite.id}/diarios`} className="text-xs text-blue-600 hover:underline">
                Ver todos ({worksite._count.dailyLogs})
              </Link>
            </CardHeader>
            <CardContent>
              {recentLogs.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Nenhum diário registrado ainda.</p>
              ) : (
                <div className="space-y-2">
                  {recentLogs.map(log => (
                    <Link key={log.id} href={`/diarios/${log.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 group">
                      <div>
                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">{formatDate(log.date)}</p>
                        <p className="text-xs text-gray-500">por {log.createdBy.name}</p>
                      </div>
                      <Badge variant={LOG_VARIANTS[log.status] as never}>{LOG_LABELS[log.status]}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Team */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Equipe</CardTitle>
                {canManage && (
                  <Link href={`/obras/${worksite.id}/equipe`} className="text-xs text-blue-600 hover:underline">Gerenciar</Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {worksite.worksiteUsers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-2">Sem membros associados.</p>
              ) : (
                <div className="space-y-2">
                  {worksite.worksiteUsers.map(wu => (
                    <div key={wu.id} className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-blue-700">{wu.user.name[0]}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{wu.user.name}</p>
                        <p className="text-xs text-gray-500">{ROLE_LABELS[wu.role] ?? wu.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
