'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2, LayoutDashboard, HardHat, BookOpen,
  Users, FileBarChart, Settings, ShieldCheck, Menu, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import type { UserRole } from '@prisma/client'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: UserRole[]
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'GESTOR_OBRA', 'COLABORADOR'] },
  { href: '/obras', label: 'Obras', icon: HardHat, roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'GESTOR_OBRA', 'COLABORADOR'] },
  { href: '/diarios', label: 'Diários', icon: BookOpen, roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'GESTOR_OBRA', 'COLABORADOR'] },
  { href: '/relatorios', label: 'Relatórios', icon: FileBarChart, roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'GESTOR_OBRA'] },
  { href: '/admin/usuarios', label: 'Usuários', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA'] },
  { href: '/admin/empresa', label: 'Empresa', icon: Settings, roles: ['ADMIN_EMPRESA'] },
  { href: '/admin/auditoria', label: 'Auditoria', icon: ShieldCheck, roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA'] },
]

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const visibleNav = NAV.filter(item => item.roles.includes(role))

  const NavContent = () => (
    <>
      <div className="flex items-center gap-2 px-4 py-5 border-b border-blue-800">
        <Building2 className="w-7 h-7 text-white flex-shrink-0" />
        <span className="font-bold text-white text-sm leading-tight">Diário de Obras</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Navegação principal">
        {visibleNav.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-800 text-white'
                  : 'text-blue-100 hover:bg-blue-800/60 hover:text-white'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" aria-hidden />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-4 py-3 border-t border-blue-800">
        <p className="text-xs text-blue-300 uppercase tracking-wide">{role.replace('_', ' ')}</p>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-blue-900 flex-shrink-0">
        <NavContent />
      </aside>

      {/* Mobile toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-blue-900 text-white p-2 rounded-lg shadow"
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} aria-hidden />
          <aside className="md:hidden fixed left-0 top-0 bottom-0 w-56 bg-blue-900 z-50 flex flex-col shadow-2xl">
            <NavContent />
          </aside>
        </>
      )}
    </>
  )
}
