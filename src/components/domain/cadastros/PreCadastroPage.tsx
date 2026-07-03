'use client'

import { useState, useEffect } from 'react'
import { Loader2, Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

interface Item { id: string; name: string; description?: string | null }

interface Props {
  title: string
  description: string
  apiPath: string
  itemLabel: string
  placeholder?: string
}

export function PreCadastroPage({ title, description, apiPath, itemLabel, placeholder }: Props) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(apiPath).then(r => r.json()).then(d => setItems(d.data ?? [])).finally(() => setLoading(false))
  }, [apiPath])

  async function add() {
    if (!newName.trim()) { setError(`Nome do ${itemLabel} é obrigatório.`); return }
    setError('')
    setSaving(true)
    const res = await fetch(apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    if (res.ok) {
      const json = await res.json()
      setItems(prev => [...prev, json.data])
      setNewName('')
    } else {
      const json = await res.json()
      setError(json?.error?.message ?? 'Erro ao salvar.')
    }
    setSaving(false)
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return
    const res = await fetch(`${apiPath}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    })
    if (res.ok) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, name: editName.trim() } : i))
      setEditId(null)
    }
  }

  async function remove(id: string) {
    if (!confirm(`Remover este ${itemLabel}?`)) return
    const res = await fetch(`${apiPath}/${id}`, { method: 'DELETE' })
    if (res.ok) setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>

      {/* Add new */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Adicionar {itemLabel}</p>
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={e => { setNewName(e.target.value); setError('') }}
              placeholder={placeholder ?? `Nome do ${itemLabel}`}
              onKeyDown={e => e.key === 'Enter' && add()}
              className="flex-1"
            />
            <Button onClick={add} disabled={saving} size="sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : items.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Nenhum {itemLabel} cadastrado ainda.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map(item => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  {editId === item.id ? (
                    <>
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveEdit(item.id)}
                        className="flex-1 h-8 text-sm"
                        autoFocus
                      />
                      <button onClick={() => saveEdit(item.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-gray-800">{item.name}</span>
                      <button
                        onClick={() => { setEditId(item.id); setEditName(item.name) }}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        aria-label="Editar"
                      ><Pencil className="w-3.5 h-3.5" /></button>
                      <button
                        onClick={() => remove(item.id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        aria-label="Remover"
                      ><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
