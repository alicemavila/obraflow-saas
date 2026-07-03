'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { updateUserSchema, type UpdateUserInput } from '@/lib/validations/user'
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validations/auth'

interface Props { userId: string; name: string; email: string }

export function ProfileForm({ userId, name, email }: Props) {
  const router = useRouter()
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showPw, setShowPw] = useState(false)

  const profileForm = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { name },
  })

  const pwForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  })

  async function onProfileSubmit(data: UpdateUserInput) {
    setProfileMsg(null)
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setProfileMsg({ type: 'success', text: 'Perfil atualizado com sucesso.' })
      router.refresh()
    } else {
      const json = await res.json()
      setProfileMsg({ type: 'error', text: json?.error?.message ?? 'Erro ao atualizar perfil.' })
    }
  }

  async function onPwSubmit(data: ChangePasswordInput) {
    setPwMsg(null)
    const res = await fetch(`/api/users/${userId}/change-password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setPwMsg({ type: 'success', text: 'Senha alterada com sucesso.' })
      pwForm.reset()
    } else {
      const json = await res.json()
      setPwMsg({ type: 'error', text: json?.error?.message ?? 'Erro ao alterar senha.' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile info */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Dados pessoais</h2>

          {profileMsg && (
            <div role="alert" className={`text-sm rounded-lg px-4 py-3 ${profileMsg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {profileMsg.text}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" value={email} disabled className="opacity-60" />
            <p className="text-xs text-gray-400">O e-mail não pode ser alterado.</p>
          </div>

          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" {...profileForm.register('name')} aria-invalid={!!profileForm.formState.errors.name} />
              {profileForm.formState.errors.name && (
                <p className="text-xs text-red-600">{profileForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" placeholder="(11) 99999-9999" {...profileForm.register('phone')} />
            </div>
            <Button type="submit" disabled={profileForm.formState.isSubmitting}>
              {profileForm.formState.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Alterar senha</h2>

          {pwMsg && (
            <div role="alert" className={`text-sm rounded-lg px-4 py-3 ${pwMsg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {pwMsg.text}
            </div>
          )}

          <form onSubmit={pwForm.handleSubmit(onPwSubmit)} className="space-y-4" noValidate>
            {[
              { id: 'currentPassword', label: 'Senha atual', field: 'currentPassword' as const },
              { id: 'newPassword', label: 'Nova senha', field: 'newPassword' as const },
              { id: 'confirmPassword', label: 'Confirmar nova senha', field: 'confirmPassword' as const },
            ].map(f => (
              <div key={f.id} className="space-y-1.5">
                <Label htmlFor={f.id}>{f.label}</Label>
                <div className="relative">
                  <Input id={f.id} type={showPw ? 'text' : 'password'} {...pwForm.register(f.field)} aria-invalid={!!pwForm.formState.errors[f.field]} />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-label="Alternar visibilidade">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {pwForm.formState.errors[f.field] && (
                  <p className="text-xs text-red-600">{pwForm.formState.errors[f.field]?.message}</p>
                )}
              </div>
            ))}
            <Button type="submit" variant="outline" disabled={pwForm.formState.isSubmitting}>
              {pwForm.formState.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Alterar senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
