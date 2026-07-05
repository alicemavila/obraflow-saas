'use client'

import { useState } from 'react'
import { Loader2, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Activity {
  id: string
  description: string
  location: string | null
  progress: string | number | null
  unit: string | null
  quantity: string | number | null
}

interface Props {
  dailyLogId: string
  initialItems: Activity[]
  canEdit: boolean
}

export function ActivitiesManager({ dailyLogId, initialItems, canEdit }: Props) {
  const [items, setItems] = useState(initialItems)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [progress, setProgress] = useState('')

  function resetForm() {
    setDescription(''); setLocation(''); setQuantity(''); setUnit(''); setProgress(''); setError(null)
  }

  async function addActivity() {
    if (description.trim().length < 3) { setError('Descreva a atividade (mínimo 3 caracteres).'); return }
    setSaving(true)
    setError(null)
    const body: Record<string, unknown> = { description: description.trim() }
    if (location.trim()) body.location = location.trim()
    if (quantity !== '') body.quantity = Number(quantity)
    if (unit.trim()) body.unit = unit.trim()
    if (progress !== '') body.progress = Number(progress)

    const res = await fetch(`/api/daily-logs/${dailyLogId}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setError(json?.error?.message ?? 'Erro ao adicionar atividade.'); return }
    setItems(prev => [...prev, json.data])
    resetForm()
    setShowForm(false)
  }

  async function deleteActivity(id: string) {
    setDeletingId(id)
    await fetch(`/api/daily-logs/${dailyLogId}/activities/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(a => a.id !== id))
    setDeletingId(null)
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">Atividades ({items.length})</CardTitle>
        {canEdit && !showForm && (
          <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(true)} data-testid="add-activity-button">
            <Plus className="w-4 h-4 mr-1" aria-hidden />Adicionar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && !showForm && (
          <p className="text-sm text-gray-400 py-2">Nenhuma atividade registrada ainda.</p>
        )}

        {items.map(a => (
          <div key={a.id} className="flex items-start justify-between gap-2 p-3 rounded-lg bg-gray-50 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-gray-900">{a.description}</p>
              {a.location && <p className="text-xs text-gray-500 mt-0.5">📍 {a.location}</p>}
              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                {a.quantity != null && <span>{String(a.quantity)} {a.unit}</span>}
                {a.progress != null && <span className="text-green-600 font-medium">{String(a.progress)}%</span>}
              </div>
            </div>
            {canEdit && (
              <button
                type="button" onClick={() => deleteActivity(a.id)} disabled={deletingId === a.id}
                className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" aria-label="Remover atividade"
              >
                {deletingId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        ))}

        {showForm && (
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">Nova atividade</h4>
              <button type="button" onClick={() => { setShowForm(false); resetForm() }} aria-label="Fechar" className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="space-y-1.5">
              <Label htmlFor="act-desc">Descrição *</Label>
              <textarea
                id="act-desc" value={description} onChange={e => setDescription(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[70px]"
                placeholder="Ex: Concretagem da laje do 3º pavimento"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="act-loc">Local</Label>
              <Input id="act-loc" value={location} onChange={e => setLocation(e.target.value)} placeholder="Ex: Pavimento 3, ala norte" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="act-qty">Quantidade</Label>
                <Input id="act-qty" type="number" step="0.01" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="act-unit">Unidade</Label>
                <Input id="act-unit" value={unit} onChange={e => setUnit(e.target.value)} placeholder="m², m³, un..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="act-progress">Progresso (%)</Label>
                <Input id="act-progress" type="number" min="0" max="100" value={progress} onChange={e => setProgress(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(false); resetForm() }}>Cancelar</Button>
              <Button type="button" size="sm" onClick={addActivity} disabled={saving} data-testid="submit-activity-button">
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Adicionar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
