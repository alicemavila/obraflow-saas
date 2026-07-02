'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { createWorksiteSchema, type CreateWorksiteInput } from '@/lib/validations/worksite'
import { useState } from 'react'

interface Props {
  defaultValues?: Partial<CreateWorksiteInput>
  worksiteId?: string
}

export function WorksiteForm({ defaultValues, worksiteId }: Props) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const isEdit = !!worksiteId

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<CreateWorksiteInput>({
    resolver: zodResolver(createWorksiteSchema),
    defaultValues,
  })

  async function lookupCep(cep: string) {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setValue('address', `${data.logradouro}${data.complemento ? ', ' + data.complemento : ''}`)
        setValue('neighborhood', data.bairro)
        setValue('city', data.localidade)
        setValue('state', data.uf)
      }
    } catch { /* silently ignore */ }
  }

  async function onSubmit(data: CreateWorksiteInput) {
    setServerError(null)
    const url = isEdit ? `/api/worksites/${worksiteId}` : '/api/worksites'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const json = await res.json()
      setServerError(json?.error?.message ?? 'Erro ao salvar obra.')
      return
    }

    const json = await res.json()
    router.push(`/obras/${isEdit ? worksiteId : json.data.id}`)
    router.refresh()
  }

  const Field = ({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {serverError && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{serverError}</div>
      )}

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Identificação</h2>
          <Field id="name" label="Nome / Identificação da obra *" error={errors.name?.message}>
            <Input id="name" placeholder="Ex: Edifício Aurora — Torre A" {...register('name')} aria-invalid={!!errors.name} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="clientName" label="Nome do cliente / condomínio" error={errors.clientName?.message}>
              <Input id="clientName" placeholder="Condomínio XYZ" {...register('clientName')} />
            </Field>
            <Field id="contractNumber" label="Número do contrato" error={errors.contractNumber?.message}>
              <Input id="contractNumber" placeholder="CT-2025-001" {...register('contractNumber')} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Endereço</h2>
          <Field id="cep" label="CEP *" error={errors.cep?.message}>
            <Input
              id="cep" placeholder="00000-000" maxLength={9} {...register('cep')}
              onBlur={e => lookupCep(e.target.value)}
              aria-invalid={!!errors.cep}
            />
          </Field>
          <Field id="address" label="Logradouro *" error={errors.address?.message}>
            <Input id="address" placeholder="Rua, número" {...register('address')} aria-invalid={!!errors.address} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field id="neighborhood" label="Bairro" error={errors.neighborhood?.message}>
              <Input id="neighborhood" {...register('neighborhood')} />
            </Field>
            <Field id="city" label="Cidade *" error={errors.city?.message}>
              <Input id="city" {...register('city')} aria-invalid={!!errors.city} />
            </Field>
            <Field id="state" label="UF *" error={errors.state?.message}>
              <Input id="state" maxLength={2} placeholder="SP" {...register('state')} aria-invalid={!!errors.state} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Responsável técnico</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="responsibleName" label="Nome do responsável *" error={errors.responsibleName?.message}>
              <Input id="responsibleName" placeholder="Eng. João da Silva" {...register('responsibleName')} aria-invalid={!!errors.responsibleName} />
            </Field>
            <Field id="responsibleCrea" label="CREA / CAU" error={errors.responsibleCrea?.message}>
              <Input id="responsibleCrea" placeholder="CREA-SP 1234567" {...register('responsibleCrea')} />
            </Field>
            <Field id="artNumber" label="Número da ART / RRT" error={errors.artNumber?.message}>
              <Input id="artNumber" placeholder="SP-ART-2025-001" {...register('artNumber')} />
            </Field>
            <Field id="totalArea" label="Área total (m²)" error={errors.totalArea?.message}>
              <Input id="totalArea" type="number" step="0.01" min="0" {...register('totalArea', { valueAsNumber: true })} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Cronograma</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="startDate" label="Data de início *" error={errors.startDate?.message}>
              <Input id="startDate" type="date" {...register('startDate')} aria-invalid={!!errors.startDate} />
            </Field>
            <Field id="endDateForecast" label="Previsão de conclusão" error={errors.endDateForecast?.message}>
              <Input id="endDateForecast" type="date" {...register('endDateForecast')} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEdit ? 'Salvar alterações' : 'Criar obra'}
        </Button>
      </div>
    </form>
  )
}
