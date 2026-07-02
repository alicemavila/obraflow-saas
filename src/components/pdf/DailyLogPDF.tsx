'use client'

import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer'
import { formatDate, formatDateTime } from '@/lib/pdf'
import type { DailyLog, Activity, Labor, Material, Occurrence, Worksite, Company, User } from '@prisma/client'

type DailyLogWithRelations = DailyLog & {
  worksite: Worksite & { company: Company }
  createdBy: Pick<User, 'name'>
  approvedBy: Pick<User, 'name'> | null
  activities: Activity[]
  laborRecords: Labor[]
  materials: Material[]
  occurrences: (Occurrence & { createdBy: Pick<User, 'name'> })[]
}

const styles = StyleSheet.create({
  page: { fontSize: 9, fontFamily: 'Helvetica', padding: 40, color: '#1f2937' },
  header: { marginBottom: 16, borderBottom: '2px solid #1e40af', paddingBottom: 10 },
  companyName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1e40af' },
  subtitle: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  title: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 16, marginBottom: 8, color: '#1e3a8a' },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { fontFamily: 'Helvetica-Bold', width: 130, color: '#374151' },
  value: { flex: 1, color: '#1f2937' },
  sectionHeader: {
    backgroundColor: '#1e40af', color: '#ffffff',
    fontFamily: 'Helvetica-Bold', fontSize: 9,
    padding: '4 8', marginTop: 12, marginBottom: 4,
  },
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#dbeafe',
    fontFamily: 'Helvetica-Bold', fontSize: 8, padding: '3 4',
  },
  tableRow: {
    flexDirection: 'row', borderBottom: '0.5px solid #e5e7eb',
    fontSize: 8, padding: '3 4',
  },
  tableRowAlt: { backgroundColor: '#f9fafb' },
  col: { flex: 1 },
  col2: { flex: 2 },
  col3: { flex: 3 },
  footer: {
    position: 'absolute', bottom: 30, left: 40, right: 40,
    borderTop: '0.5px solid #d1d5db', paddingTop: 6,
    flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: '#9ca3af',
  },
  badge: {
    padding: '2 6', borderRadius: 4, fontSize: 8,
    fontFamily: 'Helvetica-Bold', alignSelf: 'flex-start',
  },
})

const WEATHER_LABELS: Record<string, string> = {
  ENSOLARADO: '☀ Ensolarado', NUBLADO: '☁ Nublado',
  PARCIALMENTE_NUBLADO: '⛅ Parcialmente Nublado', CHUVOSO: '🌧 Chuvoso',
  TEMPESTADE: '⛈ Tempestade', NEVE: '❄ Neve', VENTO_FORTE: '💨 Vento Forte', NEBLINA: '🌫 Neblina',
}

const SEVERITY_COLORS: Record<string, string> = {
  BAIXA: '#16a34a', MEDIA: '#d97706', ALTA: '#ea580c', CRITICA: '#dc2626',
}

export function DailyLogPDF({ log }: { log: DailyLogWithRelations }) {
  const company = log.worksite.company
  const generatedAt = formatDateTime(new Date())

  return (
    <Document title={`Diário de Obra — ${formatDate(log.date)}`} author={company.name}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{company.name}</Text>
          <Text style={styles.subtitle}>CNPJ: {company.cnpj}</Text>
        </View>

        <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 12, color: '#1e3a8a' }}>
          REGISTRO DIÁRIO DE OBRA — RDO
        </Text>

        {/* Dados da obra */}
        <Text style={styles.title}>Dados da Obra</Text>
        <View style={styles.row}><Text style={styles.label}>Obra:</Text><Text style={styles.value}>{log.worksite.name}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Endereço:</Text><Text style={styles.value}>{log.worksite.address}, {log.worksite.city} - {log.worksite.state}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Responsável Técnico:</Text><Text style={styles.value}>{log.worksite.responsibleName}</Text></View>
        {log.worksite.artNumber && <View style={styles.row}><Text style={styles.label}>ART/RRT:</Text><Text style={styles.value}>{log.worksite.artNumber}</Text></View>}
        <View style={styles.row}><Text style={styles.label}>Data do Diário:</Text><Text style={styles.value}>{formatDate(log.date)}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Elaborado por:</Text><Text style={styles.value}>{log.createdBy.name}</Text></View>
        {log.approvedBy && <View style={styles.row}><Text style={styles.label}>Aprovado por:</Text><Text style={styles.value}>{log.approvedBy.name} em {formatDateTime(log.approvedAt!)}</Text></View>}

        {/* Condições climáticas */}
        <Text style={styles.sectionHeader}>CONDIÇÕES CLIMÁTICAS</Text>
        <View style={styles.row}><Text style={styles.label}>Manhã:</Text><Text style={styles.value}>{log.weatherMorning ? WEATHER_LABELS[log.weatherMorning] : '—'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Tarde:</Text><Text style={styles.value}>{log.weatherAfternoon ? WEATHER_LABELS[log.weatherAfternoon] : '—'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Noite:</Text><Text style={styles.value}>{log.weatherEvening ? WEATHER_LABELS[log.weatherEvening] : '—'}</Text></View>
        {(log.tempMin || log.tempMax) && (
          <View style={styles.row}>
            <Text style={styles.label}>Temperatura:</Text>
            <Text style={styles.value}>{log.tempMin?.toString() ?? '—'}°C mín / {log.tempMax?.toString() ?? '—'}°C máx</Text>
          </View>
        )}
        {log.workedHours && <View style={styles.row}><Text style={styles.label}>Horas trabalhadas:</Text><Text style={styles.value}>{log.workedHours.toString()}h</Text></View>}

        {/* Atividades */}
        {log.activities.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>ATIVIDADES EXECUTADAS</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.col3}>Descrição</Text>
              <Text style={styles.col}>Local</Text>
              <Text style={styles.col}>Qtd</Text>
              <Text style={styles.col}>Un.</Text>
              <Text style={styles.col}>Progresso</Text>
            </View>
            {log.activities.map((a, i) => (
              <View key={a.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={styles.col3}>{a.description}</Text>
                <Text style={styles.col}>{a.location ?? '—'}</Text>
                <Text style={styles.col}>{a.quantity?.toString() ?? '—'}</Text>
                <Text style={styles.col}>{a.unit ?? '—'}</Text>
                <Text style={styles.col}>{a.progress ? `${a.progress}%` : '—'}</Text>
              </View>
            ))}
          </>
        )}

        {/* Mão de obra */}
        {log.laborRecords.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>MÃO DE OBRA</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.col2}>Função</Text>
              <Text style={styles.col}>Qtd</Text>
              <Text style={styles.col}>Turno</Text>
              <Text style={styles.col2}>Empresa/Subcontr.</Text>
            </View>
            {log.laborRecords.map((l, i) => (
              <View key={l.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={styles.col2}>{l.role}</Text>
                <Text style={styles.col}>{l.quantity}</Text>
                <Text style={styles.col}>{l.shift}</Text>
                <Text style={styles.col2}>{l.contractor ?? '—'}</Text>
              </View>
            ))}
            <View style={[styles.tableRow, { backgroundColor: '#dbeafe', fontFamily: 'Helvetica-Bold' }]}>
              <Text style={styles.col2}>TOTAL</Text>
              <Text style={styles.col}>{log.laborRecords.reduce((s, l) => s + l.quantity, 0)}</Text>
              <Text style={styles.col}></Text><Text style={styles.col2}></Text>
            </View>
          </>
        )}

        {/* Materiais */}
        {log.materials.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>MATERIAIS UTILIZADOS</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.col3}>Material</Text>
              <Text style={styles.col}>Quantidade</Text>
              <Text style={styles.col}>Unidade</Text>
            </View>
            {log.materials.map((m, i) => (
              <View key={m.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={styles.col3}>{m.name}</Text>
                <Text style={styles.col}>{m.quantity.toString()}</Text>
                <Text style={styles.col}>{m.unit}</Text>
              </View>
            ))}
          </>
        )}

        {/* Ocorrências */}
        {log.occurrences.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>OCORRÊNCIAS</Text>
            {log.occurrences.map((o) => (
              <View key={o.id} style={{ marginBottom: 6, padding: '4 6', border: '0.5px solid #e5e7eb' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8 }}>{o.type.replace('_', ' ')}</Text>
                  <Text style={[styles.badge, { color: SEVERITY_COLORS[o.severity] }]}>
                    ● {o.severity}
                  </Text>
                </View>
                <Text style={{ fontSize: 8 }}>{o.description}</Text>
                {o.actionTaken && <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 2 }}>Ação: {o.actionTaken}</Text>}
              </View>
            ))}
          </>
        )}

        {/* Observações */}
        {log.notes && (
          <>
            <Text style={styles.sectionHeader}>OBSERVAÇÕES GERAIS</Text>
            <Text style={{ fontSize: 8, padding: '4 6', border: '0.5px solid #e5e7eb' }}>{log.notes}</Text>
          </>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{company.name} — {log.worksite.name}</Text>
          <Text>Gerado em {generatedAt} | Diário de Obras SaaS</Text>
        </View>
      </Page>
    </Document>
  )
}
