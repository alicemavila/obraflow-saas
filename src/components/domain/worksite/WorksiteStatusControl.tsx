'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronDown } from 'lucide-react'
import type { WorksiteStatus } from '@prisma/client'

const TRANSITIONS: Record<WorksiteStatus, WorksiteStatus[]> = {
  PLANEJAMENTO: ['EM_ANDAMENTO', 'CANCELADA'],
  EM_ANDAMENTO: ['PAUSADA', 'CONCLUIDA', 'CANCELADA'],
  PAUSADA: ['EM_ANDAMENTO', 'CANCELADA'],
  CONCLUIDA: [],
  CANCELADA: [],
}
const LABELS: Record<WorksiteStatus, string> = {
  PLANEJAMENTO: 'Iniciar obra', EM_ANDAMENTO: 'Em andamento',
  PAUSADA: 'Pausar', CONCLUIDA: 'Concluir', CANCELADA: 'Cancelar',
}

export function WorksiteStatusControl({ worksiteId, currentStatus }: { worksiteId: string; currentStatus: WorksiteStatus }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const options = TRANSITIONS[currentStatus]
  if (options.length === 0) return null

  async function changeStatus(status: WorksiteStatus) {
    setLoading(true)
    setOpen(false)
    await fetch(`/api/worksites/${worksiteId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(v => !v)} disabled={loading} aria-expanded={open}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Alterar status</span><ChevronDown className="w-3 h-3 ml-1" /></>}
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-10 w-40 py-1" role="menu">
          {options.map(s => (
            <button key={s} onClick={() => changeStatus(s)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50" role="menuitem">
              {LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
