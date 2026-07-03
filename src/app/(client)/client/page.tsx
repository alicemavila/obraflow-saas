import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { MapPin, Calendar, BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import type { WorksiteStatus } from '@prisma/client'

export const metadata: Metadata = { title: 'Minhas Obras' }

const STATUS_LABELS: Record<WorksiteStatus, string> = {
  PLANEJAMENTO: 'Planejamento', EM_ANDAMENTO: 'Em andamento',
  PAUSADA: 'Pausada', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada',
}
const STATUS_VARIANTS: Record<WorksiteStatus, 'info' | 'success' | 'warning' | 'muted' | 'destructive'> = {
  PLANEJAMENTO: 'info', EM_ANDAMENTO: 'success', PAUSADA: 'warning', CONCLUIDA: 'muted', CANCELADA: 'destructive',
}

export default async function ClientHomePage() {
  const session = await auth()
  const userId = session!.user.id

  const associations = await prisma.worksiteUser.findMany({
    where: { userId },
    include: {
      worksite: {
        include: {
          _count: { select: { dailyLogs: { where: { status: 'APROVADO' } } } },
        },
      },
    },
  })

  const worksites = associations.map(a => a.worksite)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Minhas obras</h1>
        <p className="text-gray-500 text-sm mt-1">
          {worksites.length === 0 ? 'Nenhuma obra associada' : `${worksites.length} ${worksites.length === 1 ? 'obra' : 'obras'}`}
        </p>
      </div>

      {worksites.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" aria-hidden />
            <p className="text-gray-500">Você ainda não está associado a nenhuma obra.</p>
            <p className="text-gray-400 text-sm mt-1">Entre em contato com a construtora.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {worksites.map(ws => (
            <Link key={ws.id} href={`/client/obras/${ws.id}`}>
              <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer h-full">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight">{ws.name}</h3>
                    <Badge variant={STATUS_VARIANTS[ws.status]}>{STATUS_LABELS[ws.status]}</Badge>
                  </div>
                  <div className="space-y-1.5 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" aria-hidden />
                      <span>{ws.city && ws.state ? `${ws.city} — ${ws.state}` : 'Local não informado'}</span>
                    </div>
                    {ws.startDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" aria-hidden />
                        <span>Início: {formatDate(ws.startDate)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" aria-hidden />
                      <span>{ws._count.dailyLogs} {ws._count.dailyLogs === 1 ? 'diário aprovado' : 'diários aprovados'}</span>
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
