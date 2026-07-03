import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { ProfileForm } from '@/components/domain/users/ProfileForm'

export const metadata: Metadata = { title: 'Meu Perfil' }

export default async function PerfilPage() {
  const session = await auth()
  const user = session!.user

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meu perfil</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie seus dados e senha</p>
      </div>
      <ProfileForm userId={user.id} name={user.name ?? ''} email={user.email ?? ''} />
    </div>
  )
}
