import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { WorksiteTeamManager } from '@/components/domain/worksite/WorksiteTeamManager'

export const metadata: Metadata = { title: 'Equipe da Obra' }

export default async function EquipeObraPage({ params }: { params: { id: string } }) {
  const session = await auth()
  const user = session!.user

  if (!['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)) redirect(`/obras/${params.id}`)

  const worksite = await prisma.worksite.findFirst({
    where: {
      id: params.id,
      ...(user.role !== 'SUPER_ADMIN' && { companyId: user.companyId ?? undefined }),
    },
    include: {
      worksiteUsers: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { assignedAt: 'asc' },
      },
    },
  })

  if (!worksite) notFound()

  const assignedIds = worksite.worksiteUsers.map(wu => wu.userId)

  const companyUsers = await prisma.user.findMany({
    where: {
      companyId: worksite.companyId,
      isActive: true,
      id: { notIn: assignedIds },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })

  const members = worksite.worksiteUsers.map(wu => ({
    id: wu.user.id, name: wu.user.name, email: wu.user.email, worksiteRole: wu.role,
  }))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
        <Link href="/obras" className="hover:text-blue-700 transition-colors">Obras</Link>
        <span>/</span>
        <Link href={`/obras/${worksite.id}`} className="hover:text-blue-700 transition-colors truncate max-w-[200px]">{worksite.name}</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Equipe</span>
      </div>
      <div className="flex items-center gap-2">
        <Link href={`/obras/${worksite.id}`} className="text-gray-400 hover:text-blue-700 transition-colors">
          <ChevronLeft className="w-5 h-5" aria-hidden />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipe da obra</h1>
          <p className="text-gray-500 text-sm mt-1">{worksite.name}</p>
        </div>
      </div>
      <WorksiteTeamManager worksiteId={worksite.id} initialMembers={members} availableUsers={companyUsers} />
    </div>
  )
}
