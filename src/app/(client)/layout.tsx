import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Building2, LogOut } from 'lucide-react'
import Link from 'next/link'
import { signOut } from '@/lib/auth'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'CLIENTE_SINDICO') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-700" aria-hidden />
            <span className="font-bold text-gray-900 text-sm">Diário de Obras</span>
            <span className="text-gray-300 hidden sm:block">|</span>
            <span className="text-gray-500 text-sm hidden sm:block">Portal do Cliente</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:block">{session.user.name}</span>
            <form action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}>
              <button type="submit" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors" aria-label="Sair">
                <LogOut className="w-4 h-4" aria-hidden />
                <span className="hidden sm:block">Sair</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
