'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Search, X } from 'lucide-react'

interface Props {
  groups: { id: string; name: string }[]
  currentStatus?: string
  currentGroupId?: string
  currentQ?: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'PLANEJAMENTO', label: 'Planejamento' },
  { value: 'EM_ANDAMENTO', label: 'Em andamento' },
  { value: 'PAUSADA', label: 'Pausada' },
  { value: 'CONCLUIDA', label: 'Concluída' },
  { value: 'CANCELADA', label: 'Cancelada' },
]

export function WorksiteFilters({ groups, currentStatus, currentGroupId, currentQ }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }, [pathname, router, searchParams])

  const hasFilters = !!(currentStatus || currentGroupId || currentQ)

  function clearAll() {
    router.push(pathname)
  }

  const selectClass = "h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden />
        <input
          type="search"
          placeholder="Buscar obra..."
          defaultValue={currentQ}
          onChange={e => updateParam('q', e.target.value)}
          className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="Buscar obras"
        />
      </div>

      {/* Status filter */}
      <select
        value={currentStatus ?? ''}
        onChange={e => updateParam('status', e.target.value)}
        className={selectClass}
        aria-label="Filtrar por status"
      >
        {STATUS_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Group filter */}
      {groups.length > 0 && (
        <select
          value={currentGroupId ?? ''}
          onChange={e => updateParam('groupId', e.target.value)}
          className={selectClass}
          aria-label="Filtrar por grupo"
        >
          <option value="">Todos os grupos</option>
          {groups.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      )}

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
          aria-label="Limpar filtros"
        >
          <X className="w-3.5 h-3.5" aria-hidden />
          Limpar
        </button>
      )}
    </div>
  )
}
