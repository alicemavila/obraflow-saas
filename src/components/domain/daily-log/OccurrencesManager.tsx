'use client'

import { useState } from 'react'
import { Loader2, Plus, Trash2, X, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OCCURRENCE_TYPE_OPTIONS, OCCURRENCE_SEVERITY_OPTIONS } from '@/lib/daily-log-options'

interface OccurrenceItem {
  id: string
  type: string
  severity: string
  description: string
  actionTaken: string | null
  isResolved: boolean
}

interface Props {
  dailyLogId: string
  initialItems: OccurrenceItem[]
  canEdit: boolean
}

const SEV_VARIANTS: Record<string, 'muted' | 'info' | 'warning' | 'destructive'> = {
  BAIXA: 'muted', MEDIA: 'info', ALTA: 'warning', CRITICA: 'destructive',
}

export function OccurrencesManager({ dailyLogId, initialItems, canEdit }: Props) {
  const [items, setItems] = useState(initialItems)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [type, setType] = useState('OBSERVACAO')
  const [severity, setSeverity] = useState('BAIXA')
  const [description, setDescription] = useState('')
  const [actionTaken, setActionTaken] = useState('')

  function resetForm() {
    setType('OBSERVACAO'); setSeverity('BAIXA'); setDescription(''); setActionTaken(''); setError(null)
  }

  async function addOccurrence() {
    if (description.trim().length < 5) { setError('Descreva a ocorrência (mínimo 5 caracteres).'); return }
    setSaving(true)
    setError(null)
    const body: Record<string, unknown> = { type, severity, description: description.trim() }
    if (actionTaken.trim()) body.actionTaken = actionTaken.trim()

    const res = await fetch(`/api/daily-logs/${dailyLogId}/occurrences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setError(json?.error?.message ?? 'Erro ao adicionar ocorrência.'); return }
    setItems(prev => [...prev, json.data])
    resetForm()
    setShowForm(false)
  }

  async function toggleResolved(item: OccurrenceItem) {
    setBusyId(item.id)
    const res = await fetch(`/api/daily-logs/${dailyLogId}/occurrences/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isResolved: !item.isResolved }),
    })
    if (res.ok) {
      const json = await res.json()
      setItems(prev => prev.map(o => o.id === item.id ? json.data : o))
    }
    setBusyId(null)
  }

  async function deleteOccurrence(id: string) {
    setBusyId(id)
    await fetch(`/api/daily-logs/${dailyLogId}/occurrences/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(o => o.id !== id))
    setBusyId(null)
  }

  const typeLabel = (v: string) => OCCURRENCE_TYPE_OPTIONS.find(o => o.value === v)?.label ?? v

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" aria-hidden />Ocorrências ({items.length})</CardTitle>
        {canEdit && !showForm && (
          <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" aria-hidden />Adicionar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && !showForm && (
          <p className="text-sm text-gray-400 py-2">Nenhuma ocorrência registrada.</p>
        )}

        {items.map(o => (
          <div key={o.id} className="p-3 rounded-lg border text-sm">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900">{typeLabel(o.type)}</span>
                <Badge variant={SEV_VARIANTS[o.severity]}>{o.severity}</Badge>
                {o.isResolved && <Badge variant="success">Resolvida</Badge>}
              </div>
              {canEdit && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button" onClick={() => toggleResolved(o)} disabled={busyId === o.id}
                    className="text-gray-400 hover:text-green-600 transition-colors" aria-label={o.isResolved ? 'Marcar como não resolvida' : 'Marcar como resolvida'}
                    title={o.isResolved ? 'Marcar como não resolvida' : 'Marcar como resolvida'}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button" onClick={() => deleteOccurrence(o.id)} disabled={busyId === o.id}
                    className="text-gray-300 hover:text-red-500 transition-colors" aria-label="Remover ocorrência"
                  >
                    {busyId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
            <p className="text-gray-700">{o.description}</p>
            {o.actionTaken && <p className="text-xs text-gray-500 mt-1.5">Ação: {o.actionTaken}</p>}
          </div>
        ))}

        {showForm && (
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">Nova ocorrência</h4>
              <button type="button" onClick={() => { setShowForm(false); resetForm() }} aria-label="Fechar" className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="occ-type">Tipo</Label>
                <select
                  id="occ-type" value={type} onChange={e => setType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {OCCURRENCE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="occ-sev">Severidade</Label>
                <select
                  id="occ-sev" value={severity} onChange={e => setSeverity(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {OCCURRENCE_SEVERITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="occ-desc">Descrição *</Label>
              <textarea
                id="occ-desc" value={description} onChange={e => setDescription(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[70px]"
                placeholder="Descreva o que aconteceu..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="occ-action">Ação tomada</Label>
              <textarea
                id="occ-action" value={actionTaken} onChange={e => setActionTaken(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[50px]"
                placeholder="O que foi feito a respeito (opcional)"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(false); resetForm() }}>Cancelar</Button>
              <Button type="button" size="sm" onClick={addOccurrence} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Adicionar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
