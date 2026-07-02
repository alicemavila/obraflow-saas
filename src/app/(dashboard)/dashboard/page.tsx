import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { HardHat, BookOpen, CheckCircle, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const session = await auth()
  const user = session!.user
  const companyId = user.companyId

  // Estatísticas
  const [totalWorksites, activeWorksites, pendingLogs, recentLogs] = await Promise.all([
    prisma.worksite.count({ where: { companyId: companyId ?? undefined } }),
    prisma.worksite.count({ where: { companyId: companyId ?? undefined, status: 'EM_ANDAMENTO' } }),
    prisma.dailyLog.count({ where: { companyId: companyId ?? undefined, status: 'SUBMETIDO' } }),
    prisma.dailyLog.findMany({
      where: { companyId: companyId ?? undefined },
      include: {
        worksite: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  const stats = [
    { label: 'Total de Obras', value: totalWorksites, icon: HardHat, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Obras Ativas', value: activeWorksites, icon: HardHat, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Diários Pendentes', value: pendingLogs, icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  const STATUS_STYLES: Record<string, string> = {
    RASCUNHO: 'muted',
    SUBMETIDO: 'warning',
    APROVADO: 'success',
    REJEITADO: 'destructive',
  }

  const STATUS_LABELS: Record<string, string> = {
    RASCUNHO: 'Rascunho',
    SUBMETIDO: 'Aguardando',
    APROVADO: 'Aprovado',
    REJEITADO: 'Rejeitado',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Olá, {user.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">Aqui está um resumo das atividades</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`${stat.bg} p-3 rounded-xl`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} aria-hidden />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending approval alert */}
      {pendingLogs > 0 && ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'GESTOR_OBRA'].includes(user.role) && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" aria-hidden />
          <span>
            <strong>{pendingLogs} {pendingLogs === 1 ? 'diário aguarda' : 'diários aguardam'}</strong> aprovação.{' '}
            <Link href="/diarios?status=SUBMETIDO" className="underline hover:no-underline font-medium">Ver agora</Link>
          </span>
        </div>
      )}

      {/* Recent logs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Diários recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" aria-hidden />
              <p className="text-gray-400 text-sm">Nenhum diário registrado ainda.</p>
              <Link href="/obras" className="text-blue-600 text-sm hover:underline mt-1 inline-block">
                Acesse uma obra para criar o primeiro diário
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogs.map(log => (
                <Link
                  key={log.id}
                  href={`/diarios/${log.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700">
                      {log.worksite.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(log.date)} · por {log.createdBy.name}
                    </p>
                  </div>
                  <Badge variant={STATUS_STYLES[log.status] as never}>
                    {STATUS_LABELS[log.status]}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      {['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { href: '/obras/nova', label: 'Nova obra', icon: HardHat },
            { href: '/admin/usuarios', label: 'Convidar usuário', icon: CheckCircle },
            { href: '/relatorios', label: 'Relatórios', icon: BookOpen },
          ].map(action => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all text-sm font-medium text-gray-700 hover:text-blue-700"
            >
              <action.icon className="w-5 h-5" aria-hidden />
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
