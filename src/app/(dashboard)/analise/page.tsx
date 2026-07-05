import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { BarChart3, TrendingUp, HardHat, BookOpen, AlertTriangle, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Análise de Dados' }

export default async function AnalisePage() {
  const session = await auth()
  const user = session!.user
  const companyId = user.role !== 'SUPER_ADMIN' ? (user.companyId ?? undefined) : undefined

  const [
    totalWorksites,
    activeWorksites,
    incompleteWorksites,
    totalLogs,
    pendingLogs,
    totalUsers,
    recentOccurrences,
  ] = await Promise.all([
    prisma.worksite.count({ where: { companyId } }),
    prisma.worksite.count({ where: { companyId, status: 'EM_ANDAMENTO' } }),
    prisma.worksite.count({ where: { companyId, isProfileComplete: false } }),
    prisma.dailyLog.count({ where: { companyId } }),
    prisma.dailyLog.count({ where: { companyId, status: 'SUBMETIDO' } }),
    prisma.user.count({ where: { companyId, isActive: true } }),
    prisma.occurrence.count({
      where: {
        companyId,
        severity: { in: ['ALTA', 'CRITICA'] },
        isResolved: false,
      },
    }),
  ])

  const stats = [
    { label: 'Total de obras', value: totalWorksites, icon: HardHat, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Obras em andamento', value: activeWorksites, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Cadastros incompletos', value: incompleteWorksites, icon: BarChart3, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Total de diários', value: totalLogs, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Diários aguardando aprovação', value: pendingLogs, icon: BookOpen, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Usuários ativos', value: totalUsers, icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Ocorrências críticas/altas abertas', value: recentOccurrences, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Análise de dados</h1>
        <p className="text-gray-500 text-sm mt-1">Visão consolidada da sua empresa no ObraFlow</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`${stat.bg} p-3 rounded-xl flex-shrink-0`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 leading-tight mt-0.5">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" aria-hidden />
          <p className="text-gray-500 font-medium">Gráficos e análises avançadas</p>
          <p className="text-gray-400 text-sm mt-1">
            Dashboards interativos com evolução de obras, produtividade e ocorrências estão planejados para a próxima versão.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
