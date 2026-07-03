import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  User, Building2, Users, Layers, FileText,
  Hammer, Wrench, AlertTriangle, CheckSquare, CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const CADASTROS_NAV = [
  { href: '/cadastros/perfil', label: 'Meu perfil', icon: User },
  { href: '/cadastros/assinatura', label: 'Assinatura', icon: CreditCard },
  { href: '/cadastros/empresa', label: 'Empresa', icon: Building2 },
  { href: '/cadastros/usuarios', label: 'Usuários', icon: Users },
  { href: '/cadastros/grupos', label: 'Grupos de obra', icon: Layers },
  { href: '/cadastros/modelos-relatorio', label: 'Modelos de relatórios', icon: FileText },
  { href: '/cadastros/mao-de-obra', label: 'Mão de obra', icon: Hammer },
  { href: '/cadastros/equipamentos', label: 'Equipamentos', icon: Wrench },
  { href: '/cadastros/tipos-ocorrencia', label: 'Tipos de ocorrências', icon: AlertTriangle },
  { href: '/cadastros/checklist', label: 'Checklist', icon: CheckSquare },
]

export default async function CadastrosLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="flex gap-6 min-h-[calc(100vh-56px-48px)]">
      {/* Sidebar de cadastros */}
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cadastros</p>
          </div>
          <nav className="py-2" aria-label="Menu de cadastros">
            {CADASTROS_NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors'
                )}
              >
                <item.icon className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  )
}
