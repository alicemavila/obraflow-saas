import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { WorksiteForm } from '@/components/domain/worksite/WorksiteForm'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Nova Obra' }

export default async function NovaObraPage() {
  const session = await auth()
  if (!['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(session!.user.role)) redirect('/obras')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/obras" className="flex items-center gap-1 hover:text-blue-700 transition-colors">
          <ChevronLeft className="w-4 h-4" aria-hidden /> Obras
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Nova obra</span>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nova obra</h1>
        <p className="text-gray-500 text-sm mt-1">Preencha os dados para cadastrar uma nova obra</p>
      </div>
      <WorksiteForm />
    </div>
  )
}
