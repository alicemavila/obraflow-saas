'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, UserX, UserCheck, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import type { UserRole } from '@prisma/client'

interface UserRow {
  id: string; name: string; email: string; role: UserRole
  isActive: boolean; lastLoginAt: Date | null; createdAt: Date
}

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin', ADMIN_EMPRESA: 'Administrador',
  GESTOR_OBRA: 'Gestor de Obra', COLABORADOR: 'Colaborador', CLIENTE_SINDICO: 'Cliente/Síndico',
}

export function UsersList({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter()
  const [showInvite, setShowInvite] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [inviteData, setInviteData] = useState({ email: '', name: '', role: 'COLABORADOR' as UserRole })
  const [inviteError, setInviteError] = useState('')

  async function toggleActive(userId: string, active: boolean) {
    setLoading(userId)
    await fetch(`/api/users/${userId}/${active ? 'deactivate' : 'reactivate'}`, { method: 'PATCH' })
    setLoading(null)
    router.refresh()
  }

  async function sendInvite() {
    setInviteError('')
    if (!inviteData.email || !inviteData.name) { setInviteError('Preencha todos os campos.'); return }
    setLoading('invite')
    const res = await fetch('/api/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteData),
    })
    setLoading(null)
    if (!res.ok) {
      const json = await res.json()
      setInviteError(json?.error?.message ?? 'Erro ao enviar convite.')
      return
    }
    setShowInvite(false)
    setInviteData({ email: '', name: '', role: 'COLABORADOR' })
    router.refresh()
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setShowInvite(true)}>
          <Plus className="w-4 h-4 mr-2" />Convidar usuário
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr className="text-left text-xs text-gray-500 font-medium">
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Perfil</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Último acesso</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map(u => (
                  <tr key={u.id} className={u.isActive ? '' : 'opacity-60'}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{ROLE_LABELS[u.role]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.isActive ? 'success' : 'muted'}>{u.isActive ? 'Ativo' : 'Inativo'}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-500 text-xs">
                      {u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Nunca'}
                    </td>
                    <td className="px-4 py-3">
                      {u.id !== currentUserId && u.role !== 'SUPER_ADMIN' && (
                        <button
                          onClick={() => toggleActive(u.id, u.isActive)}
                          disabled={loading === u.id}
                          className="text-gray-400 hover:text-gray-700 p-1 rounded transition-colors"
                          aria-label={u.isActive ? 'Desativar usuário' : 'Reativar usuário'}
                          title={u.isActive ? 'Desativar' : 'Reativar'}
                        >
                          {loading === u.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />
                          }
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" role="dialog" aria-modal>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Mail className="w-5 h-5" />Convidar usuário</h3>
            {inviteError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{inviteError}</p>}
            {[
              { id: 'inv-name', label: 'Nome completo', type: 'text', value: inviteData.name, onChange: (v: string) => setInviteData(d => ({ ...d, name: v })), placeholder: 'João da Silva' },
              { id: 'inv-email', label: 'E-mail', type: 'email', value: inviteData.email, onChange: (v: string) => setInviteData(d => ({ ...d, email: v })), placeholder: 'joao@empresa.com' },
            ].map(f => (
              <div key={f.id} className="space-y-1.5">
                <label htmlFor={f.id} className="text-sm font-medium text-gray-700">{f.label}</label>
                <input id={f.id} type={f.type} value={f.value} onChange={e => f.onChange(e.target.value)} placeholder={f.placeholder}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div className="space-y-1.5">
              <label htmlFor="inv-role" className="text-sm font-medium text-gray-700">Perfil</label>
              <select id="inv-role" value={inviteData.role} onChange={e => setInviteData(d => ({ ...d, role: e.target.value as UserRole }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {(['ADMIN_EMPRESA', 'GESTOR_OBRA', 'COLABORADOR', 'CLIENTE_SINDICO'] as UserRole[]).map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowInvite(false); setInviteError('') }}>Cancelar</Button>
              <Button onClick={sendInvite} disabled={loading === 'invite'}>
                {loading === 'invite' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Enviar convite
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
