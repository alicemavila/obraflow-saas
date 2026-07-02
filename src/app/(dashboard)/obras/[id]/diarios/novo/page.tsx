import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { isWorksiteAssociated, canCreateDailyLog } from '@/lib/permissions'
import { NewDailyLogForm } from '@/components/domain/daily-log/NewDailyLogForm'

export const metadata: Metadata = { title: 'Novo Diário' }

export default async function NovoDiarioPage({ params }: { params: { id: string } }) {
  const session = await auth()
  const user = session!.user

  if (!canCreateDailyLog(user)) redirect(`/obras/${params.id}`)

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

  if (worksite.status !== 'EM_ANDAMENTO') redirect(`/obras/${worksite.id}`)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
        <Link href="/obras" className="hover:text-blue-700 transition-colors">Obras</Link>
        <span>/</span>
        <Link href={`/obras/${worksite.id}`} className="hover:text-blue-700 transition-colors truncate max-w-[200px]">{worksite.name}</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Novo diário</span>
      </div>
      <div className="flex items-center gap-2">
        <Link href={`/obras/${worksite.id}`} className="text-gray-400 hover:text-blue-700 transition-colors">
          <ChevronLeft className="w-5 h-5" aria-hidden />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo diário de obra</h1>
          <p className="text-gray-500 text-sm mt-1">{worksite.name}</p>
        </div>
      </div>
      <NewDailyLogForm worksiteId={worksite.id} />
    </div>
  )
}
