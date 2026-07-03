'use client'

import { useState } from 'react'
import { Loader2, Plus, Pencil, Trash2, X, Check, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

interface Group { id: string; name: string; _count: { worksites: number } }

export function GroupsManager({ groups: initial }: { groups: Group[] }) {
  const router = useRouter()
  const [groups, setGroups] = useState(initial)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')

  async function add() {
    if (!newName.trim()) { setError('Nome do grupo é obrigatório.'); return }
    setError('')
    setSaving(true)
    const res = await fetch('/api/worksite-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    if (res.ok) {
      const json = await res.json()
      setGroups(prev => [...prev, { ...json.data, _count: { worksites: 0 } }])
      setNewName('')
      router.refresh()
    } else {
      const json = await res.json()
      setError(json?.error?.message ?? 'Erro ao criar grupo.')
    }
    setSaving(false)
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return
    const res = await fetch(`/api/worksite-groups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    })
    if (res.ok) {
      setGroups(prev => prev.map(g => g.id === id ? { ...g, name: editName.trim() } : g))
      setEditId(null)
      router.refresh()
    }
  }

  async function remove(id: string, worksiteCount: number) {
    if (worksiteCount > 0) {
      alert(`Este grupo possui ${worksiteCount} obra(s). Reatribua as obras antes de remover o grupo.`)
      return
    }
    if (!confirm('Remover este grupo?')) return
    const res = await fetch(`/api/worksite-groups/${id}`, { method: 'DELETE' })
    if (res.ok) { setGroups(prev => prev.filter(g => g.id !== id)); router.refresh() }
  }

  return (
    <div className="max-w-lg space-y-6">
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Novo grupo</p>
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={e => { setNewName(e.target.value); setError('') }}
              placeholder="Ex: Residencial, Comercial, Geral..."
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

      <Card>
        <CardContent className="p-0">
          {groups.length === 0 ? (
            <div className="text-center py-10">
              <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhum grupo criado ainda.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {groups.map(g => (
                <li key={g.id} className="flex items-center gap-3 px-4 py-3">
                  {editId === g.id ? (
                    <>
                      <Input value={editName} onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveEdit(g.id)}
                        className="flex-1 h-8 text-sm" autoFocus />
                      <button onClick={() => saveEdit(g.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="flex-1 text-sm font-medium text-gray-800">{g.name}</span>
                      <span className="text-xs text-gray-400">{g._count.worksites} obra{g._count.worksites !== 1 ? 's' : ''}</span>
                      <button onClick={() => { setEditId(g.id); setEditName(g.name) }}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => remove(g.id, g._count.worksites)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
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
