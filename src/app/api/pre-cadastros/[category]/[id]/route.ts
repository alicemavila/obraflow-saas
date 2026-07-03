import { NextRequest } from 'next/server'
import { handleUpdate, handleDelete, isValidCategory } from '@/lib/pre-cadastros'
import { handleError } from '@/lib/api-response'
import { BusinessError } from '@/lib/permissions'

export async function PATCH(req: NextRequest, { params }: { params: { category: string; id: string } }) {
  if (!isValidCategory(params.category)) {
    return handleError(new BusinessError(`Categoria inválida`, 'INVALID_CATEGORY'))
  }
  return handleUpdate(req, params.category, params.id)
}

export async function DELETE(req: NextRequest, { params }: { params: { category: string; id: string } }) {
  if (!isValidCategory(params.category)) {
    return handleError(new BusinessError(`Categoria inválida`, 'INVALID_CATEGORY'))
  }
  return handleDelete(req, params.category, params.id)
}
