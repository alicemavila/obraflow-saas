import type { NextRequest } from 'next/server'
import { handleList, handleCreate, isValidCategory } from '@/lib/pre-cadastros'
import { handleError } from '@/lib/api-response'
import { BusinessError } from '@/lib/permissions'

export async function GET(req: NextRequest, props: { params: Promise<{ category: string }> }) {
  const params = await props.params;
  if (!isValidCategory(params.category)) {
    return handleError(new BusinessError(`Categoria inválida: ${params.category}`, 'INVALID_CATEGORY'))
  }
  return handleList(req, params.category)
}

export async function POST(req: NextRequest, props: { params: Promise<{ category: string }> }) {
  const params = await props.params;
  if (!isValidCategory(params.category)) {
    return handleError(new BusinessError(`Categoria inválida: ${params.category}`, 'INVALID_CATEGORY'))
  }
  return handleCreate(req, params.category)
}
