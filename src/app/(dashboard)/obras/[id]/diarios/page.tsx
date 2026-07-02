import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Plus, ChevronLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { isWorksiteAssociated, canCreateDailyLog } from '@/lib/permissions'

export const metadata: Metadata = { title: 'Diários da Obra' }

const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho', SUBMETIDO: 'Aguardando aprovação', APROVADO: 'Aprovado', REJEITADO: 'Rejeitado',
}
const STATUS_VARIANTS: Record<string, 'muted' | 'warning' | 'success' | 'destructive'> = {
  RASCUNHO: 'muted', SUBMETIDO: 'warning', APROVADO: 'success', REJEITADO: 'destructive',
}

export default async function ObraDiariosPage({
  params, searchParams,
}: { params: { id: string }; searchParams: { status?: string } }) {
  const session = await auth()
  const user = session!.user

  const worksite = await prisma.worksite.findFirst({
    where: {
      id: params.id,
      ...(user.role !== 'SUPER_ADMIN' && { companyId: user.companyId ?? undefined }),
    },
    select: { id: true, name: true, status: true },
  })
  if (!worksite) notFound()

  const associated = await isWorksiteAssociated(user, worksite.id)
  if (!associated) redirect('/obras')

  const statusFilter = user.role === 'CLIENTE_SINDICO' ? 'APROVADO' : searchParams.status

  const logs = await prisma.dailyLog.findMany({
    where: {
      worksiteId: worksite.id,
      ...(statusFilter && { status: statusFilter as never }),
    },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { activities: true, laborRecords: true, occurrences: true } },
    },
    orderBy: { date: 'desc' },
    take: 100,
  })

  const statusOptions = ['', 'RASCUNHO', 'SUBMETIDO', 'APROVADO', 'REJEITADO']
  const canCreate = canCreateDailyLog(user) && worksite.status === 'EM_ANDAMENTO'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
        <Link href="/obras" className="hover:text-blue-700 transition-colors">Obras</Link>
        <span>/</span>
        <Link href={`/obras/${worksite.id}`} className="hover:text-blue-700 transition-colors truncate max-w-[200px]">{worksite.name}</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Diários</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Link href={`/obras/${worksite.id}`} className="text-gray-400 hover:text-blue-700 transition-colors">
            <ChevronLeft className="w-5 h-5" aria-hidden />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Diários — {worksite.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{logs.length} registro{logs.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {canCreate && (
          <Button asChild size="sm">
            <Link href={`/obras/${worksite.id}/diarios/novo`}><Plus className="w-4 h-4 mr-1" aria-hidden />Novo diário</Link>
          </Button>
        )}
      </div>

      {user.role !== 'CLIENTE_SINDICO' && (
        <div className="flex items-center gap-2 flex-wrap">
          {statusOptions.map(s => (
            <Link
              key={s || 'all'}
              href={s ? `/obras/${worksite.id}/diarios?status=${s}` : `/obras/${worksite.id}/diarios`}
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
      )}

      {logs.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" aria-hidden />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Nenhum diário encontrado</h3>
          <p className="text-gray-500 text-sm">
            {canCreate ? 'Crie o primeiro diário desta obra.' : 'Ainda não há diários registrados nesta obra.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <Link key={log.id} href={`/diarios/${log.id}`}>
              <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{formatDate(log.date)}</p>
                    <p className="text-sm text-gray-500">por {log.createdBy.name}</p>
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
