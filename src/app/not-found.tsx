import Link from 'next/link'
import { Building2, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Building2 className="w-8 h-8 text-blue-600" aria-hidden />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">Página não encontrada</h2>
        <p className="text-gray-500 mb-8">
          O recurso que você procura não existe ou você não tem permissão para acessá-lo.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
