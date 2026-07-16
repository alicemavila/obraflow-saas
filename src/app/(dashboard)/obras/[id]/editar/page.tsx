import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { WorksiteForm } from '@/components/domain/worksite/WorksiteForm'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Editar Obra' }

export default async function EditarObraPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth()
  const user = session!.user

  if (!['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)) redirect('/obras')

  const worksite = await prisma.worksite.findFirst({
    where: {
      id: params.id,
      ...(user.role !== 'SUPER_ADMIN' && { companyId: user.companyId ?? undefined }),
    },
  })

  if (!worksite) notFound()

  // Prepare default values for the form (serialize dates to strings)
  const defaultValues = {
    name: worksite.name,
    status: worksite.status,
    registrationMode: worksite.registrationMode,
    responsibleName: worksite.responsibleName ?? '',
    responsibleCrea: worksite.responsibleCrea ?? '',
    startDate: worksite.startDate ? worksite.startDate.toISOString().split('T')[0] : '',
    endDateForecast: worksite.endDateForecast ? worksite.endDateForecast.toISOString().split('T')[0] : '',
    address: worksite.address ?? '',
    neighborhood: worksite.neighborhood ?? '',
    city: worksite.city ?? '',
    state: worksite.state ?? '',
    cep: worksite.cep ?? '',
    artNumber: worksite.artNumber ?? '',
    description: worksite.description ?? '',
    clientName: worksite.clientName ?? '',
    contractNumber: worksite.contractNumber ?? '',
    contractType: worksite.contractType ?? '',
    totalArea: worksite.totalArea ? Number(worksite.totalArea) : undefined,
    hasTaskList: worksite.hasTaskList,
    groupId: worksite.groupId ?? '',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/obras" className="hover:text-blue-700">Obras</Link>
        <span>/</span>
        <Link href={`/obras/${worksite.id}`} className="hover:text-blue-700 truncate max-w-[200px]">{worksite.name}</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Editar</span>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Editar obra</h1>
        <p className="text-gray-500 text-sm mt-1">
          {!worksite.isProfileComplete
            ? 'Complete os dados para finalizar o cadastro da obra.'
            : 'Atualize as informações da obra.'}
        </p>
      </div>
      <WorksiteForm defaultValues={defaultValues} worksiteId={worksite.id} />
    </div>
  )
}
