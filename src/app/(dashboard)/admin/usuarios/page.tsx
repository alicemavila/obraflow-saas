import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { UsersList } from '@/components/domain/users/UsersList'

export const metadata: Metadata = { title: 'Usuários' }

export default async function UsuariosPage() {
  const session = await auth()
  if (!['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(session!.user.role)) redirect('/dashboard')

  const users = await prisma.user.findMany({
    where: {
      ...(session!.user.role !== 'SUPER_ADMIN' && { companyId: session!.user.companyId ?? undefined }),
    },
    select: {
      id: true, name: true, email: true, role: true,
      isActive: true, lastLoginAt: true, createdAt: true,
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
        <p className="text-sm text-gray-500 mt-1">{users.length} usuário{users.length !== 1 ? 's' : ''}</p>
      </div>
      <UsersList users={users} currentUserId={session!.user.id} />
    </div>
  )
}
