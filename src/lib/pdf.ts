// PDF generation helpers using @react-pdf/renderer
// Full template components are in src/components/pdf/

import { renderToBuffer } from '@react-pdf/renderer'
import type { ReactElement } from 'react'

type ReactPdfDocumentElement = Parameters<typeof renderToBuffer>[0]

/**
 * Gera um Buffer de PDF a partir de um componente React-PDF.
 *
 * A conversão de tipo é necessária porque o TypeScript identifica o
 * componente como ReactElement genérico, enquanto o renderToBuffer exige
 * especificamente um documento do React-PDF.
 */
export async function generatePdfBuffer(
  element: ReactElement,
): Promise<Buffer> {
  const document = element as ReactPdfDocumentElement

  return renderToBuffer(document)
}

/**
 * Formats a date as DD/MM/YYYY.
 */
export function formatDate(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? new Date(date) : date

  return parsedDate.toLocaleDateString('pt-BR')
}

/**
 * Formats a date and time as DD/MM/YYYY HH:MM.
 */
export function formatDateTime(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? new Date(date) : date

  return parsedDate.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}