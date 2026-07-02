'use client'

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatDate, formatDateTime } from '@/lib/pdf'
import type { DailyLog, Activity, Labor, Material, Occurrence, Worksite, Company } from '@prisma/client'

type LogWithRelations = DailyLog & {
  createdBy: { name: string }
  approvedBy: { name: string } | null
  activities: Activity[]
  laborRecords: Labor[]
  materials: Material[]
  occurrences: Occurrence[]
}

interface Props {
  worksite: Worksite & { company: Company }
  logs: LogWithRelations[]
  options: { dateFrom: string; dateTo: string; includeOccurrences: boolean; includeLabor: boolean; includeMaterials: boolean }
  generatedBy: { id: string; role: string; companyId?: string }
}

const s = StyleSheet.create({
  page: { fontSize: 9, fontFamily: 'Helvetica', padding: 40, color: '#1f2937' },
  coverTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#1e40af', textAlign: 'center', marginTop: 80 },
  coverSub: { fontSize: 11, textAlign: 'center', color: '#6b7280', marginTop: 8 },
  coverPeriod: { fontSize: 10, textAlign: 'center', marginTop: 24, fontFamily: 'Helvetica-Bold' },
  sectionHeader: {
    backgroundColor: '#1e40af', color: '#ffffff', fontFamily: 'Helvetica-Bold',
    fontSize: 9, padding: '4 8', marginTop: 12, marginBottom: 4,
  },
  tableHeader: { flexDirection: 'row', backgroundColor: '#dbeafe', fontFamily: 'Helvetica-Bold', fontSize: 8, padding: '3 4' },
  tableRow: { flexDirection: 'row', borderBottom: '0.5px solid #e5e7eb', fontSize: 8, padding: '3 4' },
  tableRowAlt: { backgroundColor: '#f9fafb' },
  col: { flex: 1 },
  col2: { flex: 2 },
  footer: {
    position: 'absolute', bottom: 30, left: 40, right: 40,
    borderTop: '0.5px solid #d1d5db', paddingTop: 6,
    flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: '#9ca3af',
  },
})

export function PeriodReportPDF({ worksite, logs, options }: Props) {
  const company = worksite.company
  const totalLabor = logs.reduce((s, l) => s + l.laborRecords.reduce((ss, lr) => ss + lr.quantity, 0), 0)
  const totalOccurrences = logs.reduce((s, l) => s + l.occurrences.length, 0)
  const criticalOccurrences = logs.flatMap((l) => l.occurrences).filter((o) => o.severity === 'CRITICA' || o.severity === 'ALTA')

  return (
    <Document title={`Relatório — ${worksite.name}`} author={company.name}>
      {/* Cover page */}
      <Page size="A4" style={s.page}>
        <Text style={s.coverTitle}>{company.name}</Text>
        <Text style={s.coverSub}>{worksite.name}</Text>
        <Text style={s.coverSub}>{worksite.address}, {worksite.city} - {worksite.state}</Text>
        <Text style={{ ...s.coverPeriod, marginTop: 48 }}>RELATÓRIO CONSOLIDADO DE OBRAS</Text>
        <Text style={s.coverPeriod}>Período: {formatDate(options.dateFrom)} a {formatDate(options.dateTo)}</Text>
        <Text style={{ textAlign: 'center', marginTop: 12, fontSize: 9, color: '#6b7280' }}>
          Responsável Técnico: {worksite.responsibleName}
          {worksite.artNumber ? ` — ART/RRT: ${worksite.artNumber}` : ''}
        </Text>
        <Text style={{ textAlign: 'center', marginTop: 48, fontSize: 8, color: '#9ca3af' }}>
          Gerado em {formatDateTime(new Date())} | Diário de Obras SaaS
        </Text>
        <View style={s.footer} fixed>
          <Text>{company.name}</Text><Text>Diário de Obras SaaS</Text>
        </View>
      </Page>

      {/* Summary page */}
      <Page size="A4" style={s.page}>
        <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 12, color: '#1e3a8a' }}>
          SUMÁRIO EXECUTIVO
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Dias com diário', value: String(logs.length) },
            { label: 'Total mão de obra', value: String(totalLabor) },
            { label: 'Ocorrências', value: String(totalOccurrences) },
            { label: 'Ocorrências críticas/altas', value: String(criticalOccurrences.length) },
          ].map((item) => (
            <View key={item.label} style={{ flex: 1, backgroundColor: '#eff6ff', padding: 8, borderRadius: 4 }}>
              <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#1e40af' }}>{item.value}</Text>
              <Text style={{ fontSize: 7, color: '#6b7280', marginTop: 2 }}>{item.label}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionHeader}>RESUMO DOS DIÁRIOS APROVADOS</Text>
        <View style={s.tableHeader}>
          <Text style={s.col}>Data</Text>
          <Text style={s.col2}>Elaborado por</Text>
          <Text style={s.col}>H. Trabalhadas</Text>
          <Text style={s.col}>Atividades</Text>
          <Text style={s.col}>M.O.</Text>
          <Text style={s.col}>Ocorrências</Text>
        </View>
        {logs.map((l, i) => (
          <View key={l.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={s.col}>{formatDate(l.date)}</Text>
            <Text style={s.col2}>{l.createdBy.name}</Text>
            <Text style={s.col}>{l.workedHours?.toString() ?? '—'}</Text>
            <Text style={s.col}>{l.activities.length}</Text>
            <Text style={s.col}>{l.laborRecords.reduce((s, lr) => s + lr.quantity, 0)}</Text>
            <Text style={s.col}>{l.occurrences.length}</Text>
          </View>
        ))}

        {criticalOccurrences.length > 0 && (
          <>
            <Text style={s.sectionHeader}>OCORRÊNCIAS CRÍTICAS E ALTAS</Text>
            {criticalOccurrences.map((o, i) => (
              <View key={i} style={{ marginBottom: 4, padding: '4 6', border: '0.5px solid #fca5a5' }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#dc2626' }}>
                  {o.severity} — {o.type.replace('_', ' ')}
                </Text>
                <Text style={{ fontSize: 8, marginTop: 2 }}>{o.description}</Text>
                {o.actionTaken && <Text style={{ fontSize: 8, color: '#6b7280' }}>Ação: {o.actionTaken}</Text>}
              </View>
            ))}
          </>
        )}

        <View style={s.footer} fixed>
          <Text>{company.name} — {worksite.name} — Período: {formatDate(options.dateFrom)} a {formatDate(options.dateTo)}</Text>
          <Text>Gerado em {formatDateTime(new Date())}</Text>
        </View>
      </Page>
    </Document>
  )
}
