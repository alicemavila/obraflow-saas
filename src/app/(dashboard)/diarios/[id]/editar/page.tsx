import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { assertSameTenant, isWorksiteAssociated, canEditDailyLog, canSubmitDailyLog } from '@/lib/permissions'
import { Badge } from '@/components/ui/badge'
import { DailyLogHeaderForm } from '@/components/domain/daily-log/DailyLogHeaderForm'
import { ActivitiesManager } from '@/components/domain/daily-log/ActivitiesManager'
import { LaborManager } from '@/components/domain/daily-log/LaborManager'
import { MaterialsManager } from '@/components/domain/daily-log/MaterialsManager'
import { OccurrencesManager } from '@/components/domain/daily-log/OccurrencesManager'
import { SubmitDiaryBar } from '@/components/domain/daily-log/SubmitDiaryBar'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Editar Diário' }

const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho', SUBMETIDO: 'Aguardando aprovação', APROVADO: 'Aprovado', REJEITADO: 'Rejeitado',
}
const STATUS_VARIANTS: Record<string, 'muted' | 'warning' | 'success' | 'destructive'> = {
  RASCUNHO: 'muted', SUBMETIDO: 'warning', APROVADO: 'success', REJEITADO: 'destructive',
}

function decimalToNumber(value: { toNumber(): number } | null): number | null {
  return value == null ? null : value.toNumber()
}

export default async function EditarDiarioPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth()
  const user = session!.user

  if (user.role === 'CLIENTE_SINDICO') redirect(`/diarios/${params.id}`)

  const log = await prisma.dailyLog.findUnique({
    where: { id: params.id },
    include: {
      worksite: { select: { id: true, name: true } },
      activities: { orderBy: { order: 'asc' } },
      laborRecords: true,
      materials: true,
      occurrences: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!log) notFound()
  if (user.role !== 'SUPER_ADMIN') {
    try {
      assertSameTenant(user, log.companyId)
    } catch {
      notFound()
    }
  }

  const associated = await isWorksiteAssociated(user, log.worksiteId)
  if (!associated) redirect('/obras')

  const editable = canEditDailyLog(user, log.status, log.createdById)
  if (!editable) redirect(`/diarios/${log.id}`)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
        <Link href="/obras" className="hover:text-blue-700 transition-colors">Obras</Link>
        <span>/</span>
        <Link href={`/obras/${log.worksite.id}`} className="hover:text-blue-700 transition-colors truncate max-w-[200px]">{log.worksite.name}</Link>
        <span>/</span>
        <Link href={`/diarios/${log.id}`} className="hover:text-blue-700 transition-colors">{formatDate(log.date)}</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Editar</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Link href={`/diarios/${log.id}`} className="text-gray-400 hover:text-blue-700 transition-colors">
            <ChevronLeft className="w-5 h-5" aria-hidden />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">Diário — {formatDate(log.date)}</h1>
              <Badge variant={STATUS_VARIANTS[log.status]}>{STATUS_LABELS[log.status]}</Badge>
            </div>
            <p className="text-gray-500 text-sm mt-1">{log.worksite.name}</p>
          </div>
        </div>
      </div>

      {log.status === 'REJEITADO' && log.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
          <strong>Motivo da rejeição:</strong> {log.rejectionReason}
        </div>
      )}

      <DailyLogHeaderForm
        dailyLogId={log.id}
        canEdit={editable}
        initial={{
          weatherMorning: log.weatherMorning,
          weatherAfternoon: log.weatherAfternoon,
          weatherEvening: log.weatherEvening,
          tempMin: decimalToNumber(log.tempMin),
          tempMax: decimalToNumber(log.tempMax),
          workedHours: decimalToNumber(log.workedHours),
          notes: log.notes,
        }}
      />

      <ActivitiesManager
        dailyLogId={log.id}
        initialItems={log.activities.map((activity) => ({
          ...activity,
          progress: decimalToNumber(activity.progress),
          quantity: decimalToNumber(activity.quantity),
        }))}
        canEdit={editable}
      />
      <LaborManager dailyLogId={log.id} initialItems={log.laborRecords} canEdit={editable} />
      <MaterialsManager
        dailyLogId={log.id}
        initialItems={log.materials.map((material) => ({
          ...material,
          quantity: decimalToNumber(material.quantity) ?? 0,
        }))}
        canEdit={editable}
      />
      <OccurrencesManager dailyLogId={log.id} initialItems={log.occurrences} canEdit={editable} />

      {canSubmitDailyLog(user) && <SubmitDiaryBar dailyLogId={log.id} status={log.status} />}
    </div>
  )
}
