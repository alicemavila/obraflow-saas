import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, FileDown, BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Obra — Portal Cliente' }

const LOG_LABELS: Record<string, string> = { APROVADO: 'Aprovado' }

export default async function ClientObraPage({ params }: { params: { id: string } }) {
  const session = await auth()
  const userId = session!.user.id

  // Verify association
  const association = await prisma.worksiteUser.findUnique({
    where: { worksiteId_userId: { worksiteId: params.id, userId } },
  })
  if (!association) notFound()

  const worksite = await prisma.worksite.findUnique({
    where: { id: params.id },
    include: { company: { select: { name: true } } },
  })
  if (!worksite) notFound()

  const logs = await prisma.dailyLog.findMany({
    where: { worksiteId: params.id, status: 'APROVADO' },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { activities: true, occurrences: true } },
    },
    orderBy: { date: 'desc' },
    take: 30,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/client" className="flex items-center gap-1 hover:text-blue-700">
          <ChevronLeft className="w-4 h-4" aria-hidden />Obras
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate">{worksite.name}</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{worksite.name}</h1>
          <p className="text-gray-500 text-sm mt-1">{worksite.company.name}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/client/relatorios?worksiteId=${worksite.id}`}>
            <FileDown className="w-4 h-4 mr-1.5" aria-hidden />
            Gerar relatório
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Diários aprovados ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" aria-hidden />
              <p className="text-gray-400 text-sm">Nenhum diário aprovado ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <Link key={log.id} href={`/diarios/${log.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 group">
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">{formatDate(log.date)}</p>
                    <p className="text-xs text-gray-500">
                      {log._count.activities} atividade{log._count.activities !== 1 ? 's' : ''}
                      {log._count.occurrences > 0 && ` · ${log._count.occurrences} ocorrência${log._count.occurrences !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <Badge variant="success">{LOG_LABELS.APROVADO}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
