'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { acceptInviteSchema, type AcceptInviteInput } from '@/lib/validations/user'
import { z } from 'zod'

const formSchema = acceptInviteSchema.extend({ name: z.string().min(2, 'Nome obrigatório') })
type FormInput = AcceptInviteInput & { name: string }

export function AcceptInviteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [showPw, setShowPw] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: { token },
  })

  async function onSubmit(data: FormInput) {
    setServerError(null)
    const res = await fetch('/api/users/accept-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const json = await res.json()
      setServerError(json?.error?.message ?? 'Convite inválido ou expirado.')
      return
    }
    router.push('/login?invited=1')
  }

  if (!token) return <p className="text-sm text-red-600 text-center">Link de convite inválido.</p>

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {serverError}
        </div>
      )}
      <input type="hidden" {...register('token')} />

      <div className="space-y-1.5">
        <Label htmlFor="name">Seu nome completo</Label>
        <Input id="name" placeholder="João da Silva" {...register('name')} aria-invalid={!!errors.name} />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Crie uma senha</Label>
        <div className="relative">
          <Input id="password" type={showPw ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" {...register('password')} aria-invalid={!!errors.password} />
          <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-label="Alternar visibilidade">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirmar senha</Label>
        <Input id="confirmPassword" type={showPw ? 'text' : 'password'} placeholder="Repita a senha" {...register('confirmPassword')} aria-invalid={!!errors.confirmPassword} />
        {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Criar conta e entrar
      </Button>
    </form>
  )
}
