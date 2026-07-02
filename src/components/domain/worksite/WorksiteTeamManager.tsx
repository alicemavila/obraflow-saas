'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, X, UserMinus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

interface Member {
  id: string
  name: string
  email: string
  worksiteRole: string
}

interface AvailableUser {
  id: string
  name: string
  email: string
}

const ROLE_LABELS: Record<string, string> = {
  GESTOR_OBRA: 'Gestor de Obra', COLABORADOR: 'Colaborador', CLIENTE_SINDICO: 'Cliente/Síndico',
}

interface Props {
  worksiteId: string
  initialMembers: Member[]
  availableUsers: AvailableUser[]
}

export function WorksiteTeamManager({ worksiteId, initialMembers, availableUsers }: Props) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [available, setAvailable] = useState(availableUsers)
  const [showForm, setShowForm] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [role, setRole] = useState('COLABORADOR')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function addMember() {
    if (!selectedUserId) { setError('Selecione um usuário.'); return }
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/worksites/${worksiteId}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedUserId, role }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setError(json?.error?.message ?? 'Erro ao adicionar membro.'); return }

    const addedUser = available.find(u => u.id === selectedUserId)
    if (addedUser) {
      setMembers(prev => [...prev, { ...addedUser, worksiteRole: role }])
      setAvailable(prev => prev.filter(u => u.id !== selectedUserId))
    }
    setSelectedUserId('')
    setRole('COLABORADOR')
    setShowForm(false)
    router.refresh()
  }

  async function removeMember(userId: string) {
    setRemovingId(userId)
    await fetch(`/api/worksites/${worksiteId}/users/${userId}`, { method: 'DELETE' })
    const removedUser = members.find(m => m.id === userId)
    setMembers(prev => prev.filter(m => m.id !== userId))
    if (removedUser) setAvailable(prev => [...prev, { id: removedUser.id, name: removedUser.name, email: removedUser.email }])
    setRemovingId(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)} disabled={available.length === 0}>
            <Plus className="w-4 h-4 mr-1" aria-hidden />Adicionar membro
          </Button>
        )}
      </div>

      {available.length === 0 && !showForm && (
        <p className="text-xs text-gray-400">Todos os usuários da empresa já estão associados a esta obra.</p>
      )}

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">Adicionar membro à obra</h4>
              <button type="button" onClick={() => { setShowForm(false); setError(null) }} aria-label="Fechar" className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="team-user">Usuário</Label>
                <select
                  id="team-user" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Selecione...</option>
                  {available.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="team-role">Papel na obra</Label>
                <select
                  id="team-role" value={role} onChange={e => setRole(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(false); setError(null) }}>Cancelar</Button>
              <Button type="button" size="sm" onClick={addMember} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhum membro associado a esta obra ainda.</p>
          ) : (
            <div className="divide-y">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-blue-700">
                      {m.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                      <p className="text-xs text-gray-500 truncate">{m.email} · {ROLE_LABELS[m.worksiteRole] ?? m.worksiteRole}</p>
                    </div>
                  </div>
                  <button
                    type="button" onClick={() => removeMember(m.id)} disabled={removingId === m.id}
                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" aria-label="Remover da obra"
                    title="Remover da obra"
                  >
                    {removingId === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
