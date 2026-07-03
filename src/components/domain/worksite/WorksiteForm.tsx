'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2, Zap, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { createWorksiteSchema, type CreateWorksiteInput } from '@/lib/validations/worksite'
import { useState, useEffect } from 'react'
import { WorksiteRegistrationMode, WorksiteStatus } from '@prisma/client'
import { cn } from '@/lib/utils'

interface Props {
  defaultValues?: Partial<CreateWorksiteInput>
  worksiteId?: string
}

const STATUS_LABELS: Record<WorksiteStatus, string> = {
  PLANEJAMENTO: 'Planejamento',
  EM_ANDAMENTO: 'Em andamento',
  PAUSADA: 'Pausada',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
}

export function WorksiteForm({ defaultValues, worksiteId }: Props) {
  const router = useRouter()
  const isEdit = !!worksiteId
  const [serverError, setServerError] = useState<string | null>(null)
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([])

  const defaultMode =
    (defaultValues?.registrationMode as WorksiteRegistrationMode) ??
    WorksiteRegistrationMode.SIMPLE

  const [mode, setMode] = useState<WorksiteRegistrationMode>(defaultMode)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateWorksiteInput>({
    resolver: zodResolver(createWorksiteSchema),
    defaultValues: {
      registrationMode: defaultMode,
      hasTaskList: false,
      status: WorksiteStatus.PLANEJAMENTO,
      ...defaultValues,
    },
  })

  const isComplete = mode === WorksiteRegistrationMode.COMPLETE

  // Sync mode into form
  useEffect(() => {
    setValue('registrationMode', mode)
  }, [mode, setValue])

  // Load groups
  useEffect(() => {
    fetch('/api/worksite-groups')
      .then(r => r.json())
      .then(d => setGroups(d.data ?? []))
      .catch(() => {})
  }, [])

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
    } catch { /* ignore */ }
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
      const details = json?.error?.details
      if (details?.length) {
        setServerError(details.map((d: { message: string }) => d.message).join(' • '))
      } else {
        setServerError(json?.error?.message ?? 'Erro ao salvar obra.')
      }
      return
    }

    const json = await res.json()
    router.push(`/obras/${isEdit ? worksiteId : json.data.id}`)
    router.refresh()
  }

  const Field = ({
    id, label, required, error, children,
  }: { id: string; label: string; required?: boolean; error?: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {serverError && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {serverError}
        </div>
      )}

      {/* Mode toggle */}
      {!isEdit && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Tipo de cadastro</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  value: WorksiteRegistrationMode.SIMPLE,
                  icon: Zap,
                  title: 'Cadastro simples',
                  desc: 'Crie a obra rapidamente. Complete os dados depois.',
                },
                {
                  value: WorksiteRegistrationMode.COMPLETE,
                  icon: ClipboardList,
                  title: 'Cadastro completo',
                  desc: 'Preencha todos os dados técnicos, endereço e responsável.',
                },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                    mode === opt.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-200 bg-white'
                  )}
                  aria-pressed={mode === opt.value}
                >
                  <opt.icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', mode === opt.value ? 'text-blue-600' : 'text-gray-400')} aria-hidden />
                  <div>
                    <p className={cn('text-sm font-semibold', mode === opt.value ? 'text-blue-700' : 'text-gray-900')}>
                      {opt.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <input type="hidden" {...register('registrationMode')} />

      {/* Campos básicos — sempre visíveis */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Identificação</h2>
          <Field id="name" label="Nome / Identificação da obra" required error={errors.name?.message}>
            <Input id="name" placeholder="Ex: Edifício Aurora — Torre A" {...register('name')} aria-invalid={!!errors.name} />
          </Field>

          <Field id="status" label="Status" required error={errors.status?.message}>
            <select
              id="status"
              {...register('status')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              aria-invalid={!!errors.status}
            >
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </Field>

          {/* Grupo — simples e completo */}
          {groups.length > 0 && (
            <Field id="groupId" label="Grupo" error={errors.groupId?.message}>
              <select
                id="groupId"
                {...register('groupId')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Sem grupo</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </Field>
          )}

          {/* Lista de tarefas */}
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="hasTaskList"
              render={({ field }) => (
                <input
                  id="hasTaskList"
                  type="checkbox"
                  checked={!!field.value}
                  onChange={e => field.onChange(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              )}
            />
            <Label htmlFor="hasTaskList" className="cursor-pointer">Lista de tarefas</Label>
          </div>
        </CardContent>
      </Card>

      {/* Campos do cadastro completo */}
      {isComplete && (
        <>
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Responsável técnico</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field id="responsibleName" label="Responsável técnico" required error={errors.responsibleName?.message}>
                  <Input id="responsibleName" placeholder="Eng. João da Silva" {...register('responsibleName')} aria-invalid={!!errors.responsibleName} />
                </Field>
                <Field id="responsibleCrea" label="CREA / CAU" error={errors.responsibleCrea?.message}>
                  <Input id="responsibleCrea" placeholder="CREA-SP 1234567" {...register('responsibleCrea')} />
                </Field>
                <Field id="artNumber" label="ART / RRT" error={errors.artNumber?.message}>
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
              <h2 className="font-semibold text-gray-900">Contrato</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field id="clientName" label="Contratante" error={errors.clientName?.message}>
                  <Input id="clientName" placeholder="Condomínio XYZ" {...register('clientName')} />
                </Field>
                <Field id="contractNumber" label="Nº do contrato" error={errors.contractNumber?.message}>
                  <Input id="contractNumber" placeholder="CT-2025-001" {...register('contractNumber')} />
                </Field>
                <Field id="contractType" label="Tipo de contrato" error={errors.contractType?.message}>
                  <Input id="contractType" placeholder="Empreitada global" {...register('contractType')} />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Cronograma</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field id="startDate" label="Data de início" required error={errors.startDate?.message}>
                  <Input id="startDate" type="date" {...register('startDate')} aria-invalid={!!errors.startDate} />
                </Field>
                <Field id="endDateForecast" label="Previsão de término" error={errors.endDateForecast?.message}>
                  <Input id="endDateForecast" type="date" {...register('endDateForecast')} />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Endereço</h2>
              <Field id="cep" label="CEP" error={errors.cep?.message}>
                <Input
                  id="cep" placeholder="00000-000" maxLength={9}
                  {...register('cep')}
                  onBlur={e => lookupCep(e.target.value)}
                />
              </Field>
              <Field id="address" label="Logradouro" error={errors.address?.message}>
                <Input id="address" placeholder="Rua, número" {...register('address')} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field id="neighborhood" label="Bairro" error={errors.neighborhood?.message}>
                  <Input id="neighborhood" {...register('neighborhood')} />
                </Field>
                <Field id="city" label="Cidade" error={errors.city?.message}>
                  <Input id="city" {...register('city')} />
                </Field>
                <Field id="state" label="UF" error={errors.state?.message}>
                  <Input id="state" maxLength={2} placeholder="SP" {...register('state')} />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Descrição</h2>
              <textarea
                id="description"
                {...register('description')}
                rows={3}
                placeholder="Descreva o escopo e objetivo da obra..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEdit ? 'Salvar alterações' : isComplete ? 'Criar obra completa' : 'Criar obra'}
        </Button>
      </div>
    </form>
  )
}
