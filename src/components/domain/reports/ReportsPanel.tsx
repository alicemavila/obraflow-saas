'use client'

import { useState } from 'react'
import { Loader2, FileDown, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface Worksite { id: string; name: string }

interface Props { worksites: Worksite[] }

export function ReportsPanel({ worksites }: Props) {
  const [worksiteId, setWorksiteId] = useState(worksites[0]?.id ?? '')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    if (!worksiteId || !dateFrom || !dateTo) {
      setError('Selecione a obra e o período.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/worksite/${worksiteId}/period`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateFrom, dateTo, includeOccurrences: true, includeLabor: true, includeMaterials: true }),
      })

      if (!res.ok) {
        const json = await res.json()
        setError(json?.error?.message ?? 'Erro ao gerar relatório.')
        return
      }

      // Stream PDF download
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `relatorio-${dateFrom}-${dateTo}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Erro inesperado ao gerar relatório.')
    } finally {
      setLoading(false)
    }
  }

  if (worksites.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-400">
          <Calendar className="w-10 h-10 mx-auto mb-3" aria-hidden />
          <p>Nenhuma obra disponível para relatório.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Relatório por período</h2>

        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="worksite-select">Obra</Label>
          <select
            id="worksite-select"
            value={worksiteId}
            onChange={e => setWorksiteId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {worksites.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="date-from">Data inicial</Label>
            <Input id="date-from" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date-to">Data final</Label>
            <Input id="date-to" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>

        <p className="text-xs text-gray-400">Período máximo de 90 dias. Apenas diários aprovados são incluídos.</p>

        <Button onClick={generate} disabled={loading} className="w-full">
          {loading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando PDF...</>
            : <><FileDown className="w-4 h-4 mr-2" />Gerar relatório PDF</>
          }
        </Button>
      </CardContent>
    </Card>
  )
}
