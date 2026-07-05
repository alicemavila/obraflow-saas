import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import { Building2 } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Redefinir senha' }

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-700 rounded-2xl mb-4 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Redefinir senha</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm text-blue-600 hover:underline">Voltar para o login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
