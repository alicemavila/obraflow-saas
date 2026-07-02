'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { WEATHER_OPTIONS } from '@/lib/daily-log-options'

interface Props {
  worksiteId: string
}

export function NewDailyLogForm({ worksiteId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [weatherMorning, setWeatherMorning] = useState('')
  const [weatherAfternoon, setWeatherAfternoon] = useState('')
  const [weatherEvening, setWeatherEvening] = useState('')
  const [tempMin, setTempMin] = useState('')
  const [tempMax, setTempMax] = useState('')
  const [notes, setNotes] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const body: Record<string, unknown> = { date }
    if (weatherMorning) body.weatherMorning = weatherMorning
    if (weatherAfternoon) body.weatherAfternoon = weatherAfternoon
    if (weatherEvening) body.weatherEvening = weatherEvening
    if (tempMin !== '') body.tempMin = Number(tempMin)
    if (tempMax !== '') body.tempMax = Number(tempMax)
    if (notes.trim()) body.notes = notes.trim()

    const res = await fetch(`/api/worksites/${worksiteId}/daily-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const json = await res.json()
    if (!res.ok) {
      setError(json?.error?.message ?? 'Erro ao criar diário.')
      setLoading(false)
      return
    }

    router.push(`/diarios/${json.data.id}/editar`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Data do diário</h2>
          <div className="space-y-1.5">
            <Label htmlFor="date">Data *</Label>
            <Input
              id="date" type="date" value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => setDate(e.target.value)}
              required
            />
            <p className="text-xs text-gray-400">Não é possível registrar diários com data futura ou duplicada para a mesma obra.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Condições climáticas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { id: 'weatherMorning', label: 'Manhã', value: weatherMorning, set: setWeatherMorning },
              { id: 'weatherAfternoon', label: 'Tarde', value: weatherAfternoon, set: setWeatherAfternoon },
              { id: 'weatherEvening', label: 'Noite', value: weatherEvening, set: setWeatherEvening },
            ].map(f => (
              <div key={f.id} className="space-y-1.5">
                <Label htmlFor={f.id}>{f.label}</Label>
                <select
                  id={f.id}
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">—</option>
                  {WEATHER_OPTIONS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tempMin">Temp. mínima (°C)</Label>
              <Input id="tempMin" type="number" step="0.1" value={tempMin} onChange={e => setTempMin(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tempMax">Temp. máxima (°C)</Label>
              <Input id="tempMax" type="number" step="0.1" value={tempMax} onChange={e => setTempMax(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Observações gerais</h2>
          <textarea
            className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            placeholder="Observações sobre o dia (opcional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            aria-label="Observações gerais"
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Criar diário e continuar
        </Button>
      </div>
    </form>
  )
}
