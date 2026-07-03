import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { UsersList } from '@/components/domain/users/UsersList'

export const metadata: Metadata = { title: 'Usuários' }

export default async function UsuariosPage() {
  const session = await auth()
  const user = session!.user
  if (!['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)) redirect('/cadastros/perfil')

  const users = await prisma.user.findMany({
    where: {
      ...(user.role !== 'SUPER_ADMIN' && { companyId: user.companyId ?? undefined }),
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
        <h1 className="text-xl font-bold text-gray-900">Usuários</h1>
        <p className="text-sm text-gray-500 mt-1">{users.length} usuário{users.length !== 1 ? 's' : ''} cadastrados</p>
      </div>
      <UsersList users={users} currentUserId={user.id} />
    </div>
  )
}
