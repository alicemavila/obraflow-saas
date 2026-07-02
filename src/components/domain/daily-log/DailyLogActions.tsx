'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export function DailyLogActions({ logId }: { logId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  async function approve() {
    setLoading('approve')
    await fetch(`/api/daily-logs/${logId}/approve`, { method: 'POST' })
    setLoading(null)
    router.refresh()
  }

  async function reject() {
    if (reason.trim().length < 10) { setError('Informe o motivo com ao menos 10 caracteres.'); return }
    setLoading('reject')
    await fetch(`/api/daily-logs/${logId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    setLoading(null)
    setShowRejectModal(false)
    router.refresh()
  }

  return (
    <>
      <Button size="sm" onClick={approve} disabled={!!loading} className="bg-green-600 hover:bg-green-700">
        {loading === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1" />Aprovar</>}
      </Button>
      <Button size="sm" variant="destructive" onClick={() => setShowRejectModal(true)} disabled={!!loading}>
        <XCircle className="w-4 h-4 mr-1" />Rejeitar
      </Button>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" role="dialog" aria-modal aria-label="Rejeitar diário">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-gray-900 mb-2">Rejeitar diário</h3>
            <p className="text-sm text-gray-500 mb-4">Informe o motivo para que o autor possa corrigir e resubmeter.</p>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Descreva o que precisa ser corrigido..."
              value={reason}
              onChange={e => { setReason(e.target.value); setError('') }}
              aria-label="Motivo da rejeição"
            />
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={reject} disabled={loading === 'reject'}>
                {loading === 'reject' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar rejeição'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
