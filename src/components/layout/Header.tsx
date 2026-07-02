'use client'

import { signOut } from 'next-auth/react'
import { LogOut, User, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import type { UserRole } from '@prisma/client'

interface Props {
  user: { name?: string | null; email?: string | null; role: UserRole; companySlug?: string }
}

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_EMPRESA: 'Administrador',
  GESTOR_OBRA: 'Gestor de Obra',
  COLABORADOR: 'Colaborador',
  CLIENTE_SINDICO: 'Cliente / Síndico',
}

export function Header({ user }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-2 pl-8 md:pl-0">
        <span className="text-sm font-medium text-gray-700 hidden sm:block">
          {user.companySlug ? `@${user.companySlug}` : 'Sistema'}
        </span>
      </div>

      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors"
          aria-label="Menu do usuário"
          aria-expanded={open}
        >
          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-blue-700" aria-hidden />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-gray-900 leading-none">{user.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{ROLE_LABELS[user.role]}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50" role="menu">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <Link href="/perfil" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" role="menuitem" onClick={() => setOpen(false)}>
              <User className="w-4 h-4" aria-hidden /> Meu perfil
            </Link>
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
    </header>
  )
}
