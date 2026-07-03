import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Empresa' }

export default async function EmpresaPage() {
  const session = await auth()
  const user = session!.user
  if (!['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)) redirect('/cadastros/perfil')

  const company = user.companyId
    ? await prisma.company.findUnique({
        where: { id: user.companyId },
        select: { name: true, cnpj: true, slug: true, plan: true, status: true, maxWorksites: true, maxUsers: true, createdAt: true },
      })
    : null

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Empresa</h1>
        <p className="text-sm text-gray-500 mt-1">Dados da sua empresa no ObraFlow</p>
      </div>
      {company ? (
        <Card>
          <CardContent className="p-6 space-y-4 text-sm">
            {[
              { label: 'Razão social', value: company.name },
              { label: 'CNPJ', value: company.cnpj },
              { label: 'Slug', value: company.slug },
              { label: 'Plano', value: company.plan },
              { label: 'Status', value: company.status },
              { label: 'Limite de obras', value: company.maxWorksites.toString() },
              { label: 'Limite de usuários', value: company.maxUsers.toString() },
            ].map(row => (
              <div key={row.label} className="flex items-start gap-3">
                <span className="text-gray-500 w-36 flex-shrink-0">{row.label}</span>
                <span className="text-gray-900 font-medium">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <p className="text-gray-400 text-sm">Empresa não encontrada.</p>
      )}
    </div>
  )
}
