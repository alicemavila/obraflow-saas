'use client'

import { useState } from 'react'
import { Loader2, Check, Cloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WEATHER_OPTIONS } from '@/lib/daily-log-options'

interface Props {
  dailyLogId: string
  canEdit: boolean
  initial: {
    weatherMorning: string | null
    weatherAfternoon: string | null
    weatherEvening: string | null
    tempMin: string | number | null
    tempMax: string | number | null
    workedHours: string | number | null
    notes: string | null
  }
}

export function DailyLogHeaderForm({ dailyLogId, canEdit, initial }: Props) {
  const [weatherMorning, setWeatherMorning] = useState(initial.weatherMorning ?? '')
  const [weatherAfternoon, setWeatherAfternoon] = useState(initial.weatherAfternoon ?? '')
  const [weatherEvening, setWeatherEvening] = useState(initial.weatherEvening ?? '')
  const [tempMin, setTempMin] = useState(initial.tempMin != null ? String(initial.tempMin) : '')
  const [tempMax, setTempMax] = useState(initial.tempMax != null ? String(initial.tempMax) : '')
  const [workedHours, setWorkedHours] = useState(initial.workedHours != null ? String(initial.workedHours) : '')
  const [notes, setNotes] = useState(initial.notes ?? '')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)

    const body: Record<string, unknown> = {}
    body.weatherMorning = weatherMorning || undefined
    body.weatherAfternoon = weatherAfternoon || undefined
    body.weatherEvening = weatherEvening || undefined
    body.tempMin = tempMin !== '' ? Number(tempMin) : undefined
    body.tempMax = tempMax !== '' ? Number(tempMax) : undefined
    body.workedHours = workedHours !== '' ? Number(workedHours) : undefined
    body.notes = notes.trim() || undefined

    const res = await fetch(`/api/daily-logs/${dailyLogId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setError(json?.error?.message ?? 'Erro ao salvar.'); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!canEdit) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Cloud className="w-4 h-4" aria-hidden />Condições Climáticas</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {[
            { label: 'Manhã', value: initial.weatherMorning ? WEATHER_OPTIONS.find(w => w.value === initial.weatherMorning)?.label : '—' },
            { label: 'Tarde', value: initial.weatherAfternoon ? WEATHER_OPTIONS.find(w => w.value === initial.weatherAfternoon)?.label : '—' },
            { label: 'Noite', value: initial.weatherEvening ? WEATHER_OPTIONS.find(w => w.value === initial.weatherEvening)?.label : '—' },
            { label: 'Temperatura', value: (initial.tempMin || initial.tempMax) ? `${initial.tempMin ?? '—'}°C / ${initial.tempMax ?? '—'}°C` : '—' },
          ].map(item => (
            <div key={item.label}><p className="text-xs text-gray-500 mb-0.5">{item.label}</p><p className="font-medium text-gray-900">{item.value}</p></div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Cloud className="w-4 h-4" aria-hidden />Condições Climáticas</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { id: 'wh-morning', label: 'Manhã', value: weatherMorning, set: setWeatherMorning },
            { id: 'wh-afternoon', label: 'Tarde', value: weatherAfternoon, set: setWeatherAfternoon },
            { id: 'wh-evening', label: 'Noite', value: weatherEvening, set: setWeatherEvening },
          ].map(f => (
            <div key={f.id} className="space-y-1.5">
              <Label htmlFor={f.id}>{f.label}</Label>
              <select
                id={f.id} value={f.value} onChange={e => f.set(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">—</option>
                {WEATHER_OPTIONS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="wh-tempmin">Temp. mínima (°C)</Label>
            <Input id="wh-tempmin" type="number" step="0.1" value={tempMin} onChange={e => setTempMin(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-tempmax">Temp. máxima (°C)</Label>
            <Input id="wh-tempmax" type="number" step="0.1" value={tempMax} onChange={e => setTempMax(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-hours">Horas trabalhadas</Label>
            <Input id="wh-hours" type="number" step="0.5" min="0" max="24" value={workedHours} onChange={e => setWorkedHours(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wh-notes">Observações gerais</Label>
          <textarea
            id="wh-notes" value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[90px]"
          />
        </div>
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="outline" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-1 text-green-600" /> : null}
            {saved ? 'Salvo' : 'Salvar condições'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
