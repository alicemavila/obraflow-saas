'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { X, Loader2, Zap, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createWorksiteSchema, type CreateWorksiteInput } from '@/lib/validations/worksite'
import { WorksiteRegistrationMode, WorksiteStatus } from '@prisma/client'
import { cn } from '@/lib/utils'

interface Props {
  onClose: () => void
}

const STATUS_LABELS: Record<WorksiteStatus, string> = {
  PLANEJAMENTO: 'Planejamento',
  EM_ANDAMENTO: 'Em andamento',
  PAUSADA: 'Pausada',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
}

export function WorksiteModal({ onClose }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<WorksiteRegistrationMode>(WorksiteRegistrationMode.SIMPLE)
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([])
  const [serverError, setServerError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const isComplete = mode === WorksiteRegistrationMode.COMPLETE

  const {
    register, handleSubmit, setValue, control,
    formState: { errors, isSubmitting },
  } = useForm<CreateWorksiteInput>({
    resolver: zodResolver(createWorksiteSchema),
    defaultValues: {
      registrationMode: WorksiteRegistrationMode.SIMPLE,
      hasTaskList: false,
      status: WorksiteStatus.PLANEJAMENTO,
    },
  })

  useEffect(() => { setValue('registrationMode', mode) }, [mode, setValue])

  useEffect(() => {
    fetch('/api/worksite-groups').then(r => r.json()).then(d => setGroups(d.data ?? [])).catch(() => {})
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Trap focus inside dialog
  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    const firstFocusable = el.querySelector<HTMLElement>('button, input, select, textarea')
    firstFocusable?.focus()
  }, [])

  async function onSubmit(data: CreateWorksiteInput) {
    setServerError(null)
    const res = await fetch('/api/worksites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const json = await res.json()
      const details = json?.error?.details
      setServerError(details?.length ? details.map((d: { message: string }) => d.message).join(' • ') : json?.error?.message ?? 'Erro ao salvar obra.')
      return
    }
    const json = await res.json()
    onClose()
    router.push(`/obras/${json.data.id}`)
    router.refresh()
  }

  async function lookupCep(cep: string) {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    try {
      const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const d = await r.json()
      if (!d.erro) {
        setValue('address', `${d.logradouro}${d.complemento ? ', ' + d.complemento : ''}`)
        setValue('neighborhood', d.bairro)
        setValue('city', d.localidade)
        setValue('state', d.uf)
      }
    } catch { /* ignore */ }
  }

  const Field = ({ id, label, required, error, children }: { id: string; label: string; required?: boolean; error?: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}{required && <span className="text-red-500 ml-0.5" aria-hidden>*</span>}</Label>
      {children}
      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
    </div>
  )

  const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto"
      aria-modal="true"
      role="dialog"
      aria-labelledby="worksite-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id="worksite-modal-title" className="text-lg font-bold text-gray-900">Adicionar obra</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Fechar">
            <X className="w-5 h-5 text-gray-500" aria-hidden />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="px-6 pt-5 pb-2">
          <p className="text-sm text-gray-600 mb-3 font-medium">Tipo de cadastro</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { value: WorksiteRegistrationMode.SIMPLE, icon: Zap, title: 'Cadastro simples', desc: 'Crie rapidamente com nome, status e grupo.' },
              { value: WorksiteRegistrationMode.COMPLETE, icon: ClipboardList, title: 'Cadastro completo', desc: 'Preencha todos os dados técnicos e de gestão.' },
            ] as const).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMode(opt.value)}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all',
                  mode === opt.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-200 bg-white'
                )}
                aria-pressed={mode === opt.value}
              >
                <opt.icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', mode === opt.value ? 'text-blue-600' : 'text-gray-400')} aria-hidden />
                <div>
                  <p className={cn('text-sm font-semibold', mode === opt.value ? 'text-blue-700' : 'text-gray-900')}>{opt.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <input type="hidden" {...register('registrationMode')} />

          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {serverError && (
              <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{serverError}</div>
            )}

            {/* ── Campos sempre visíveis ── */}
            <Field id="name" label="Nome da obra" required error={errors.name?.message}>
              <Input id="name" placeholder="Ex: Edifício Aurora — Torre A" {...register('name')} aria-invalid={!!errors.name} autoFocus />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="status" label="Status" required error={errors.status?.message}>
                <select id="status" {...register('status')} className={selectClass} aria-invalid={!!errors.status}>
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </Field>

              <Field id="groupId" label="Grupo" required error={errors.groupId?.message}>
                <select id="groupId" {...register('groupId')} className={selectClass} aria-invalid={!!errors.groupId}>
                  <option value="">Selecione um grupo…</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </Field>
            </div>

            <div className="flex items-center gap-3">
              <Controller control={control} name="hasTaskList"
                render={({ field }) => (
                  <input id="hasTaskList" type="checkbox" checked={!!field.value}
                    onChange={e => field.onChange(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                )} />
              <Label htmlFor="hasTaskList" className="cursor-pointer text-sm">Habilitar lista de tarefas</Label>
            </div>

            {/* ── Campos do cadastro completo ── */}
            {isComplete && (
              <>
                <hr className="border-gray-100" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Responsável técnico</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="responsibleName" label="Responsável técnico" required error={errors.responsibleName?.message}>
                    <Input id="responsibleName" placeholder="Eng. João da Silva" {...register('responsibleName')} aria-invalid={!!errors.responsibleName} />
                  </Field>
                  <Field id="responsibleCrea" label="CREA / CAU" error={errors.responsibleCrea?.message}>
                    <Input id="responsibleCrea" placeholder="CREA-SP 1234567" {...register('responsibleCrea')} />
                  </Field>
                </div>

                <hr className="border-gray-100" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cronograma</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="startDate" label="Data de início" required error={errors.startDate?.message}>
                    <Input id="startDate" type="date" {...register('startDate')} aria-invalid={!!errors.startDate} />
                  </Field>
                  <Field id="endDateForecast" label="Previsão de término" required error={errors.endDateForecast?.message}>
                    <Input id="endDateForecast" type="date" {...register('endDateForecast')} aria-invalid={!!errors.endDateForecast} />
                  </Field>
                </div>

                <hr className="border-gray-100" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contrato</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="clientName" label="Contratante" error={errors.clientName?.message}>
                    <Input id="clientName" placeholder="Condomínio XYZ" {...register('clientName')} />
                  </Field>
                  <Field id="contractType" label="Tipo de contrato" error={errors.contractType?.message}>
                    <Input id="contractType" placeholder="Empreitada global" {...register('contractType')} />
                  </Field>
                  <Field id="contractNumber" label="Nº do contrato" error={errors.contractNumber?.message}>
                    <Input id="contractNumber" placeholder="CT-2025-001" {...register('contractNumber')} />
                  </Field>
                  <Field id="artNumber" label="ART / RRT" error={errors.artNumber?.message}>
                    <Input id="artNumber" placeholder="SP-ART-2025-001" {...register('artNumber')} />
                  </Field>
                  <Field id="totalArea" label="Área total (m²)" error={errors.totalArea?.message}>
                    <Input id="totalArea" type="number" step="0.01" min="0" {...register('totalArea', { valueAsNumber: true })} />
                  </Field>
                </div>

                <hr className="border-gray-100" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Endereço</p>

                <Field id="cep" label="CEP" error={errors.cep?.message}>
                  <Input id="cep" placeholder="00000-000" maxLength={9} {...register('cep')} onBlur={e => lookupCep(e.target.value)} />
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
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar obra
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
