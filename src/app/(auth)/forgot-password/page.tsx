import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'
import { Building2 } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Recuperar senha' }

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-700 rounded-2xl mb-4 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Recuperar senha</h1>
          <p className="text-gray-500 text-sm mt-1">Enviaremos um link para seu e-mail</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <ForgotPasswordForm />
          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm text-blue-600 hover:underline">Voltar para o login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
