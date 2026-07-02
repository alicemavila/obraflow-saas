import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { ReportsPanel } from '@/components/domain/reports/ReportsPanel'

export const metadata: Metadata = { title: 'Relatórios' }

export default async function RelatoriosPage() {
  const session = await auth()
  const user = session!.user
  if (user.role === 'COLABORADOR') redirect('/dashboard')

  let worksiteIds: string[] | undefined
  if (['GESTOR_OBRA', 'CLIENTE_SINDICO'].includes(user.role)) {
    const assocs = await prisma.worksiteUser.findMany({ where: { userId: user.id }, select: { worksiteId: true } })
    worksiteIds = assocs.map(a => a.worksiteId)
  }

  const worksites = await prisma.worksite.findMany({
    where: {
      ...(user.role !== 'SUPER_ADMIN' && { companyId: user.companyId ?? undefined }),
      ...(worksiteIds && { id: { in: worksiteIds } }),
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-sm text-gray-500 mt-1">Gere relatórios PDF por diário ou por período</p>
      </div>
      <ReportsPanel worksites={worksites} />
    </div>
  )
}
