import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Diários de Obra' }

const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho', SUBMETIDO: 'Aguardando aprovação', APROVADO: 'Aprovado', REJEITADO: 'Rejeitado',
}
const STATUS_VARIANTS: Record<string, 'muted' | 'warning' | 'success' | 'destructive'> = {
  RASCUNHO: 'muted', SUBMETIDO: 'warning', APROVADO: 'success', REJEITADO: 'destructive',
}

export default async function DiariosPage({ searchParams }: { searchParams: { status?: string } }) {
  const session = await auth()
  const user = session!.user

  let worksiteIds: string[] | undefined
  if (['GESTOR_OBRA', 'COLABORADOR'].includes(user.role)) {
    const assocs = await prisma.worksiteUser.findMany({ where: { userId: user.id }, select: { worksiteId: true } })
    worksiteIds = assocs.map(a => a.worksiteId)
  }

  const logs = await prisma.dailyLog.findMany({
    where: {
      companyId: user.role !== 'SUPER_ADMIN' ? (user.companyId ?? undefined) : undefined,
      ...(worksiteIds && { worksiteId: { in: worksiteIds } }),
      ...(searchParams.status && { status: searchParams.status as never }),
    },
    include: {
      worksite: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      _count: { select: { activities: true, laborRecords: true, occurrences: true } },
    },
    orderBy: { date: 'desc' },
    take: 50,
  })

  const statusOptions = ['', 'RASCUNHO', 'SUBMETIDO', 'APROVADO', 'REJEITADO']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diários de Obra</h1>
          <p className="text-sm text-gray-500 mt-1">{logs.length} registro{logs.length !== 1 ? 's' : ''}</p>
        </div>
        {/* Status filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {statusOptions.map(s => (
            <Link
              key={s || 'all'}
              href={s ? `/diarios?status=${s}` : '/diarios'}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                (searchParams.status ?? '') === s
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'text-gray-600 border-gray-200 hover:border-blue-300 bg-white'
              }`}
            >
              {s ? STATUS_LABELS[s] : 'Todos'}
            </Link>
          ))}
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" aria-hidden />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Nenhum diário encontrado</h3>
          <p className="text-gray-500 text-sm">Acesse uma obra para criar um diário.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <Link key={log.id} href={`/diarios/${log.id}`}>
              <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{log.worksite.name}</p>
                    <p className="text-sm text-gray-500">{formatDate(log.date)} · por {log.createdBy.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{log._count.activities} atividade{log._count.activities !== 1 ? 's' : ''}</span>
                      <span>{log._count.laborRecords} mão de obra</span>
                      {log._count.occurrences > 0 && <span className="text-amber-600">{log._count.occurrences} ocorrência{log._count.occurrences !== 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANTS[log.status]}>{STATUS_LABELS[log.status]}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
