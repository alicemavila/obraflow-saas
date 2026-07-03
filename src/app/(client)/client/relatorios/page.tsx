import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ReportsPanel } from '@/components/domain/reports/ReportsPanel'

export const metadata: Metadata = { title: 'Relatórios — Portal Cliente' }

export default async function ClientRelatoriosPage({
  searchParams,
}: {
  searchParams: { worksiteId?: string }
}) {
  const session = await auth()
  const userId = session!.user.id

  const assocs = await prisma.worksiteUser.findMany({
    where: { userId },
    include: { worksite: { select: { id: true, name: true } } },
  })

  const worksites = assocs.map(a => ({ id: a.worksite.id, name: a.worksite.name }))

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-500 text-sm mt-1">Gere relatórios PDF das obras autorizadas</p>
      </div>
      <ReportsPanel worksites={worksites} />
    </div>
  )
}
