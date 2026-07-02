'use client'

import { useState } from 'react'
import { Loader2, Plus, Trash2, X, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SHIFT_OPTIONS } from '@/lib/daily-log-options'

interface LaborItem {
  id: string
  role: string
  quantity: number
  shift: string
  contractor: string | null
}

interface Props {
  dailyLogId: string
  initialItems: LaborItem[]
  canEdit: boolean
}

export function LaborManager({ dailyLogId, initialItems, canEdit }: Props) {
  const [items, setItems] = useState(initialItems)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [role, setRole] = useState('')
  const [quantity, setQuantity] = useState('')
  const [shift, setShift] = useState('INTEGRAL')
  const [contractor, setContractor] = useState('')

  function resetForm() {
    setRole(''); setQuantity(''); setShift('INTEGRAL'); setContractor(''); setError(null)
  }

  async function addLabor() {
    if (role.trim().length < 2) { setError('Informe a função.'); return }
    if (!quantity || Number(quantity) <= 0) { setError('Informe uma quantidade válida.'); return }
    setSaving(true)
    setError(null)
    const body: Record<string, unknown> = { role: role.trim(), quantity: Number(quantity), shift }
    if (contractor.trim()) body.contractor = contractor.trim()

    const res = await fetch(`/api/daily-logs/${dailyLogId}/labor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setError(json?.error?.message ?? 'Erro ao adicionar registro.'); return }
    setItems(prev => [...prev, json.data])
    resetForm()
    setShowForm(false)
  }

  async function deleteLabor(id: string) {
    setDeletingId(id)
    await fetch(`/api/daily-logs/${dailyLogId}/labor/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(l => l.id !== id))
    setDeletingId(null)
  }

  const total = items.reduce((s, l) => s + l.quantity, 0)
  const shiftLabel = (v: string) => SHIFT_OPTIONS.find(o => o.value === v)?.label ?? v

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4" aria-hidden />Mão de Obra {items.length > 0 && `— Total: ${total}`}
        </CardTitle>
        {canEdit && !showForm && (
          <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" aria-hidden />Adicionar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && !showForm && (
          <p className="text-sm text-gray-400 py-2">Nenhum registro de mão de obra ainda.</p>
        )}

        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs text-gray-500">
                <th className="pb-2 font-medium">Função</th><th className="pb-2 font-medium">Qtd</th>
                <th className="pb-2 font-medium">Turno</th><th className="pb-2 font-medium">Empresa</th>
                {canEdit && <th className="pb-2"></th>}
              </tr></thead>
              <tbody className="divide-y">
                {items.map(l => (
                  <tr key={l.id}>
                    <td className="py-2">{l.role}</td><td>{l.quantity}</td>
                    <td>{shiftLabel(l.shift)}</td><td className="text-gray-500">{l.contractor ?? '—'}</td>
                    {canEdit && (
                      <td className="text-right">
                        <button type="button" onClick={() => deleteLabor(l.id)} disabled={deletingId === l.id} className="text-gray-300 hover:text-red-500 transition-colors" aria-label="Remover">
                          {deletingId === l.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showForm && (
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">Novo registro</h4>
              <button type="button" onClick={() => { setShowForm(false); resetForm() }} aria-label="Fechar" className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lb-role">Função *</Label>
                <Input id="lb-role" value={role} onChange={e => setRole(e.target.value)} placeholder="Pedreiro, eletricista..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lb-qty">Quantidade *</Label>
                <Input id="lb-qty" type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lb-shift">Turno</Label>
                <select
                  id="lb-shift" value={shift} onChange={e => setShift(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {SHIFT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lb-contractor">Empresa/Contratada</Label>
                <Input id="lb-contractor" value={contractor} onChange={e => setContractor(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(false); resetForm() }}>Cancelar</Button>
              <Button type="button" size="sm" onClick={addLabor} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Adicionar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
