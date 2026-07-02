'use client'

import { useState } from 'react'
import { Loader2, Plus, Trash2, X, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MaterialItem {
  id: string
  name: string
  quantity: string | number
  unit: string
}

interface Props {
  dailyLogId: string
  initialItems: MaterialItem[]
  canEdit: boolean
}

export function MaterialsManager({ dailyLogId, initialItems, canEdit }: Props) {
  const [items, setItems] = useState(initialItems)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')

  function resetForm() {
    setName(''); setQuantity(''); setUnit(''); setError(null)
  }

  async function addMaterial() {
    if (name.trim().length < 2) { setError('Informe o nome do material.'); return }
    if (!quantity || Number(quantity) <= 0) { setError('Informe uma quantidade válida.'); return }
    if (!unit.trim()) { setError('Informe a unidade.'); return }
    setSaving(true)
    setError(null)

    const res = await fetch(`/api/daily-logs/${dailyLogId}/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), quantity: Number(quantity), unit: unit.trim() }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setError(json?.error?.message ?? 'Erro ao adicionar material.'); return }
    setItems(prev => [...prev, json.data])
    resetForm()
    setShowForm(false)
  }

  async function deleteMaterial(id: string) {
    setDeletingId(id)
    await fetch(`/api/daily-logs/${dailyLogId}/materials/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(m => m.id !== id))
    setDeletingId(null)
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2"><Package className="w-4 h-4" aria-hidden />Materiais ({items.length})</CardTitle>
        {canEdit && !showForm && (
          <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" aria-hidden />Adicionar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && !showForm && (
          <p className="text-sm text-gray-400 py-2">Nenhum material registrado ainda.</p>
        )}

        {items.map(m => (
          <div key={m.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
            <span>{m.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-gray-600 font-medium">{String(m.quantity)} {m.unit}</span>
              {canEdit && (
                <button type="button" onClick={() => deleteMaterial(m.id)} disabled={deletingId === m.id} className="text-gray-300 hover:text-red-500 transition-colors" aria-label="Remover material">
                  {deletingId === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        ))}

        {showForm && (
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">Novo material</h4>
              <button type="button" onClick={() => { setShowForm(false); resetForm() }} aria-label="Fechar" className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3 sm:col-span-1 space-y-1.5">
                <Label htmlFor="mat-name">Nome *</Label>
                <Input id="mat-name" value={name} onChange={e => setName(e.target.value)} placeholder="Cimento CP-II" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mat-qty">Quantidade *</Label>
                <Input id="mat-qty" type="number" step="0.01" min="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mat-unit">Unidade *</Label>
                <Input id="mat-unit" value={unit} onChange={e => setUnit(e.target.value)} placeholder="sc, m³, kg..." />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(false); resetForm() }}>Cancelar</Button>
              <Button type="button" size="sm" onClick={addMaterial} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Adicionar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
