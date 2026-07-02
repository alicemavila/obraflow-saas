// PDF generation helpers using @react-pdf/renderer
// Full template components are in src/components/pdf/

import { renderToBuffer } from '@react-pdf/renderer'
import type { ReactElement } from 'react'

/**
 * Renders a React-PDF component to a Buffer.
 * Used by report API routes.
 */
export async function generatePdfBuffer(element: ReactElement): Promise<Buffer> {
  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
}

/** Format a Date to DD/MM/YYYY */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pt-BR')
}

/** Format a DateTime to DD/MM/YYYY HH:MM */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
