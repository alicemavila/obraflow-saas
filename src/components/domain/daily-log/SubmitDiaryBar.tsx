'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  dailyLogId: string
  status: 'RASCUNHO' | 'SUBMETIDO' | 'APROVADO' | 'REJEITADO'
}

export function SubmitDiaryBar({ dailyLogId, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status !== 'RASCUNHO' && status !== 'REJEITADO') return null

  async function submit() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/daily-logs/${dailyLogId}/submit`, { method: 'POST' })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json?.error?.message ?? 'Erro ao submeter diário.'); return }
    router.push(`/diarios/${dailyLogId}`)
    router.refresh()
  }

  return (
    <Card className="border-blue-100 bg-blue-50/50">
      <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-gray-900">Diário pronto para envio?</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Ao submeter, o diário fica bloqueado para edição até ser aprovado ou rejeitado. É necessário ao menos uma atividade ou registro de mão de obra.
          </p>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
        <Button type="button" onClick={submit} disabled={loading} className="flex-shrink-0">
          {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
          Enviar para aprovação
        </Button>
      </CardContent>
    </Card>
  )
}
