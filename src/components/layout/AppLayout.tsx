'use client'

import { useState, useRef, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2, Plus, ChevronDown, User, LogOut,
  HardHat, FileBarChart, BarChart3, Settings,
  Users, Layers, FileText, Hammer, Wrench,
  AlertTriangle, CheckSquare, Menu, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@prisma/client'
import { WorksiteModal } from '@/components/domain/worksite/WorksiteModal'

interface Props {
  user: {
    id: string
    name?: string | null
    email?: string | null
    role: UserRole
    companyId?: string
    companySlug?: string
  }
  companyName?: string
  children: React.ReactNode
}

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_EMPRESA: 'Administrador',
  GESTOR_OBRA: 'Gestor de Obra',
  COLABORADOR: 'Colaborador',
  CLIENTE_SINDICO: 'Cliente / Síndico',
}

const MAIN_NAV = [
  { href: '/obras', label: 'Obras', icon: HardHat },
  { href: '/relatorios', label: 'Relatórios', icon: FileBarChart },
  { href: '/analise', label: 'Análise de dados', icon: BarChart3 },
]

const CADASTROS_ITEMS = [
  { href: '/cadastros/perfil', label: 'Meu perfil', icon: User },
  { href: '/cadastros/empresa', label: 'Empresa', icon: Building2 },
  { href: '/cadastros/usuarios', label: 'Usuários', icon: Users },
  { href: '/cadastros/grupos', label: 'Grupos de obra', icon: Layers },
  { href: '/cadastros/modelos-relatorio', label: 'Modelos de relatórios', icon: FileText },
  { href: '/cadastros/mao-de-obra', label: 'Mão de obra', icon: Hammer },
  { href: '/cadastros/equipamentos', label: 'Equipamentos', icon: Wrench },
  { href: '/cadastros/tipos-ocorrencia', label: 'Tipos de ocorrências', icon: AlertTriangle },
  { href: '/cadastros/checklist', label: 'Checklist', icon: CheckSquare },
]

export function AppLayout({ user, companyName, children }: Props) {
  const pathname = usePathname()
  const canCreate = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'GESTOR_OBRA'].includes(user.role)
  const isAdmin = ['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)

  const [addOpen, setAddOpen] = useState(false)
  const [cadastrosOpen, setCadastrosOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [worksiteModalOpen, setWorksiteModalOpen] = useState(false)

  const addRef = useRef<HTMLDivElement>(null)
  const cadastrosRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setAddOpen(false)
      if (cadastrosRef.current && !cadastrosRef.current.contains(e.target as Node)) setCadastrosOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Top Nav ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-4">
          {/* Logo / Company name */}
          <Link href="/obras" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" aria-hidden />
            </div>
            <span className="font-bold text-gray-900 text-sm hidden sm:block truncate max-w-[140px]">
              {companyName ?? 'ObraFlow'}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1" aria-label="Navegação principal">
            {MAIN_NAV.map(item => {
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <item.icon className="w-4 h-4" aria-hidden />
                  {item.label}
                </Link>
              )
            })}

            {/* Cadastros dropdown */}
            <div className="relative" ref={cadastrosRef}>
              <button
                onClick={() => setCadastrosOpen(v => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  cadastrosOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
                aria-expanded={cadastrosOpen}
                aria-haspopup="menu"
              >
                <Settings className="w-4 h-4" aria-hidden />
                Cadastros
                <ChevronDown className={cn('w-3 h-3 transition-transform', cadastrosOpen && 'rotate-180')} aria-hidden />
              </button>
              {cadastrosOpen && (
                <div className="absolute left-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50" role="menu">
                  {CADASTROS_ITEMS.map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setCadastrosOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <item.icon className="w-4 h-4 text-gray-400" aria-hidden />
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2 ml-auto">
            {/* + ADICIONAR button */}
            {canCreate && (
              <div className="relative" ref={addRef}>
                <button
                  onClick={() => setAddOpen(v => !v)}
                  className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                  aria-expanded={addOpen}
                  aria-haspopup="menu"
                  aria-label="Adicionar novo item"
                >
                  <Plus className="w-4 h-4" aria-hidden />
                  <span className="hidden sm:block">ADICIONAR</span>
                </button>
                {addOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50" role="menu">
                    <button
                      role="menuitem"
                      onClick={() => { setAddOpen(false); setWorksiteModalOpen(true) }}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                    >
                      <HardHat className="w-4 h-4 text-blue-500" aria-hidden />
                      Adicionar Obra
                    </button>
                    <Link
                      href="/relatorios/novo"
                      role="menuitem"
                      onClick={() => setAddOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <FileBarChart className="w-4 h-4 text-green-500" aria-hidden />
                      Adicionar Relatório
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/cadastros/usuarios/convidar"
                        role="menuitem"
                        onClick={() => setAddOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Users className="w-4 h-4 text-purple-500" aria-hidden />
                        Adicionar Usuário
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* User menu */}
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setUserOpen(v => !v)}
                className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-2 py-1.5 transition-colors"
                aria-expanded={userOpen}
                aria-label="Menu do usuário"
              >
                <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-700">
                    {user.name?.[0]?.toUpperCase() ?? 'U'}
                  </span>
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-800 max-w-[100px] truncate">
                  {user.name}
                </span>
                <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 hidden sm:block transition-transform', userOpen && 'rotate-180')} aria-hidden />
              </button>
              {userOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50" role="menu">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    <p className="text-xs text-blue-600 mt-0.5">{ROLE_LABELS[user.role]}</p>
                  </div>
                  <Link href="/cadastros/perfil" role="menuitem" onClick={() => setUserOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <User className="w-4 h-4" aria-hidden /> Meu perfil
                  </Link>
                  {isAdmin && (
                    <Link href="/cadastros/empresa" role="menuitem" onClick={() => setUserOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <Building2 className="w-4 h-4" aria-hidden /> Empresa
                    </Link>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                    role="menuitem"
                  >
                    <LogOut className="w-4 h-4" aria-hidden /> Sair
                  </button>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileOpen(v => !v)}
              aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            {MAIN_NAV.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
                  pathname.startsWith(item.href) ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100')}>
                <item.icon className="w-4 h-4" aria-hidden /> {item.label}
              </Link>
            ))}
            <div className="border-t border-gray-100 pt-2 mt-2">
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Cadastros</p>
              {CADASTROS_ITEMS.map(item => (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
                  <item.icon className="w-4 h-4 text-gray-400" aria-hidden /> {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 max-w-screen-xl w-full mx-auto px-4 py-6">
        {children}
      </main>

      {/* ── Worksite modal ── */}
      {worksiteModalOpen && (
        <WorksiteModal onClose={() => setWorksiteModalOpen(false)} />
      )}
    </div>
  )
}
