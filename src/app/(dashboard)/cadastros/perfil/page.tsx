import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { ProfileForm } from '@/components/domain/users/ProfileForm'

export const metadata: Metadata = { title: 'Meu Perfil' }

export default async function PerfilPage() {
  const session = await auth()
  const user = session!.user
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Meu perfil</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie seus dados pessoais e senha</p>
      </div>
      <ProfileForm userId={user.id} name={user.name ?? ''} email={user.email ?? ''} />
    </div>
  )
}
