import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Cloud, Users, Package, AlertTriangle, MessageSquare, FileDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DailyLogActions } from '@/components/domain/daily-log/DailyLogActions'
import { CommentSection } from '@/components/domain/daily-log/CommentSection'
import { formatDate, formatDateTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Diário de Obra' }

const WEATHER_LABELS: Record<string, string> = {
  ENSOLARADO: '☀ Ensolarado', NUBLADO: '☁ Nublado', PARCIALMENTE_NUBLADO: '⛅ Parcial',
  CHUVOSO: '🌧 Chuvoso', TEMPESTADE: '⛈ Tempestade', NEVE: '❄ Neve', VENTO_FORTE: '💨 Vento', NEBLINA: '🌫 Neblina',
}
const SEV_VARIANTS: Record<string, 'muted' | 'info' | 'warning' | 'destructive'> = {
  BAIXA: 'muted', MEDIA: 'info', ALTA: 'warning', CRITICA: 'destructive',
}

export default async function DiarioDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth()
  const user = session!.user

  const log = await prisma.dailyLog.findFirst({
    where: {
      id: params.id,
      ...(user.role !== 'SUPER_ADMIN' && { companyId: user.companyId ?? undefined }),
    },
    include: {
      worksite: { select: { id: true, name: true, status: true } },
      createdBy: { select: { id: true, name: true } },
      submittedBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      rejectedBy: { select: { name: true } },
      activities: { orderBy: { order: 'asc' } },
      laborRecords: true,
      materials: true,
      occurrences: { include: { createdBy: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
    },
  })

  if (!log) notFound()
  if (user.role === 'CLIENTE_SINDICO' && log.status !== 'APROVADO') notFound()

  const canApprove = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'GESTOR_OBRA'].includes(user.role)
  const canEdit = log.status !== 'APROVADO' && !['CLIENTE_SINDICO'].includes(user.role)
  const totalLabor = log.laborRecords.reduce((s, l) => s + l.quantity, 0)

  const STATUS_LABELS: Record<string, string> = { RASCUNHO: 'Rascunho', SUBMETIDO: 'Aguardando aprovação', APROVADO: 'Aprovado', REJEITADO: 'Rejeitado' }
  const STATUS_VARIANTS: Record<string, 'muted' | 'warning' | 'success' | 'destructive'> = { RASCUNHO: 'muted', SUBMETIDO: 'warning', APROVADO: 'success', REJEITADO: 'destructive' }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
        <Link href="/obras" className="hover:text-blue-700">Obras</Link>
        <span>/</span>
        <Link href={`/obras/${log.worksite.id}`} className="hover:text-blue-700 truncate max-w-[200px]">{log.worksite.name}</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{formatDate(log.date)}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">Diário — {formatDate(log.date)}</h1>
            <Badge variant={STATUS_VARIANTS[log.status]}>{STATUS_LABELS[log.status]}</Badge>
          </div>
          <p className="text-gray-500 text-sm mt-1">{log.worksite.name} · elaborado por {log.createdBy.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {log.status === 'APROVADO' && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/reports/daily-log/${log.id}`} download><FileDown className="w-4 h-4 mr-1" />PDF</a>
            </Button>
          )}
          {canEdit && <Button variant="outline" size="sm" asChild><Link href={`/diarios/${log.id}/editar`}>Editar</Link></Button>}
          {canApprove && log.status === 'SUBMETIDO' && <DailyLogActions logId={log.id} />}
        </div>
      </div>

      {/* Rejection reason */}
      {log.status === 'REJEITADO' && log.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
          <strong>Motivo da rejeição:</strong> {log.rejectionReason}
          {log.rejectedBy && <span className="text-red-600"> — {log.rejectedBy.name}</span>}
        </div>
      )}

      {/* Climate */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Cloud className="w-4 h-4" aria-hidden />Condições Climáticas</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {[
            { label: 'Manhã', value: log.weatherMorning ? WEATHER_LABELS[log.weatherMorning] : '—' },
            { label: 'Tarde', value: log.weatherAfternoon ? WEATHER_LABELS[log.weatherAfternoon] : '—' },
            { label: 'Noite', value: log.weatherEvening ? WEATHER_LABELS[log.weatherEvening] : '—' },
            { label: 'Temperatura', value: (log.tempMin || log.tempMax) ? `${log.tempMin ?? '—'}°C / ${log.tempMax ?? '—'}°C` : '—' },
          ].map(item => (
            <div key={item.label}><p className="text-xs text-gray-500 mb-0.5">{item.label}</p><p className="font-medium text-gray-900">{item.value}</p></div>
          ))}
          {log.workedHours && <div><p className="text-xs text-gray-500 mb-0.5">Horas trabalhadas</p><p className="font-medium">{log.workedHours.toString()}h</p></div>}
        </CardContent>
      </Card>

      {/* Activities */}
      {log.activities.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Atividades ({log.activities.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {log.activities.map(a => (
                <div key={a.id} className="flex items-start justify-between gap-2 p-3 rounded-lg bg-gray-50 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{a.description}</p>
                    {a.location && <p className="text-xs text-gray-500 mt-0.5">📍 {a.location}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {a.quantity && <p className="text-xs text-gray-700">{a.quantity.toString()} {a.unit}</p>}
                    {a.progress && <p className="text-xs text-green-600 font-medium">{a.progress.toString()}%</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Labor */}
      {log.laborRecords.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" aria-hidden />Mão de Obra — Total: {totalLabor} trabalhadores</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-xs text-gray-500">
                  <th className="pb-2 font-medium">Função</th><th className="pb-2 font-medium">Qtd</th>
                  <th className="pb-2 font-medium">Turno</th><th className="pb-2 font-medium">Empresa</th>
                </tr></thead>
                <tbody className="divide-y">
                  {log.laborRecords.map(l => (
                    <tr key={l.id} className="py-2">
                      <td className="py-2">{l.role}</td><td>{l.quantity}</td>
                      <td>{l.shift}</td><td className="text-gray-500">{l.contractor ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Materials */}
      {log.materials.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Package className="w-4 h-4" aria-hidden />Materiais</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {log.materials.map(m => (
                <div key={m.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
                  <span>{m.name}</span>
                  <span className="text-gray-600 font-medium">{m.quantity.toString()} {m.unit}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Occurrences */}
      {log.occurrences.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" aria-hidden />Ocorrências</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {log.occurrences.map(o => (
              <div key={o.id} className="p-3 rounded-lg border text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900">{o.type.replace('_', ' ')}</span>
                  <Badge variant={SEV_VARIANTS[o.severity]}>{o.severity}</Badge>
                </div>
                <p className="text-gray-700">{o.description}</p>
                {o.actionTaken && <p className="text-xs text-gray-500 mt-1.5">Ação: {o.actionTaken}</p>}
                {o.isResolved && <p className="text-xs text-green-600 mt-1">✓ Resolvida</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {log.notes && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Observações gerais</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-gray-700 whitespace-pre-wrap">{log.notes}</p></CardContent>
        </Card>
      )}

      {/* Approval timeline */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Histórico</CardTitle></CardHeader>
        <CardContent className="text-xs text-gray-500 space-y-1">
          <p>Criado por <strong>{log.createdBy.name}</strong> em {formatDateTime(log.createdAt)}</p>
          {log.submittedBy && log.submittedAt && <p>Submetido por <strong>{log.submittedBy.name}</strong> em {formatDateTime(log.submittedAt)}</p>}
          {log.approvedBy && log.approvedAt && <p className="text-green-700">Aprovado por <strong>{log.approvedBy.name}</strong> em {formatDateTime(log.approvedAt)}</p>}
          {log.rejectedBy && log.rejectedAt && <p className="text-red-600">Rejeitado por <strong>{log.rejectedBy.name}</strong> em {formatDateTime(log.rejectedAt)}</p>}
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4" aria-hidden />Comentários</CardTitle></CardHeader>
        <CardContent>
          <CommentSection dailyLogId={log.id} status={log.status} currentUserId={user.id} currentUserRole={user.role} />
        </CardContent>
      </Card>
    </div>
  )
}
