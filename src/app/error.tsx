'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log to Sentry in production
    if (process.env.NODE_ENV === 'production') {
      console.error('[GlobalError]', error.digest)
    }
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-600" aria-hidden />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Algo deu errado</h2>
        <p className="text-gray-500 mb-8 text-sm">
          Ocorreu um erro inesperado. Nossa equipe foi notificada.
          {error.digest && <span className="block text-xs text-gray-400 mt-1">Código: {error.digest}</span>}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Tentar novamente
          </button>
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 text-sm underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}
