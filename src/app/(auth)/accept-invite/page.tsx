import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AcceptInviteForm } from '@/components/auth/AcceptInviteForm'
import { Building2 } from 'lucide-react'

export const metadata: Metadata = { title: 'Aceitar convite' }

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-700 rounded-2xl mb-4 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bem-vindo ao Diário de Obras</h1>
          <p className="text-gray-500 text-sm mt-1">Crie sua senha para acessar o sistema</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <Suspense fallback={null}>
            <AcceptInviteForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
