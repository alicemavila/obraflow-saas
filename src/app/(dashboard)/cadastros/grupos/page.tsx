import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { GroupsManager } from '@/components/domain/cadastros/GroupsManager'

export const metadata: Metadata = { title: 'Grupos de Obra' }

export default async function GruposPage() {
  const session = await auth()
  const user = session!.user

  const groups = await prisma.worksiteGroup.findMany({
    where: { companyId: user.companyId ?? undefined },
    include: { _count: { select: { worksites: true } } },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Grupos de obra</h1>
        <p className="text-sm text-gray-500 mt-1">Organize suas obras em grupos</p>
      </div>
      <GroupsManager groups={groups} />
    </div>
  )
}
