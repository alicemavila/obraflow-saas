import { NextResponse } from 'next/server'
import {
  UnauthorizedError,
  ForbiddenError,
  TenantMismatchError,
  NotFoundError,
  ConflictError,
  BusinessError,
} from '@/lib/permissions'
import { ZodError } from 'zod'

interface ApiSuccessResponse<T> {
  data: T
  message?: string
}

interface ApiErrorResponse {
  error: {
    code: string
    message: string
    details?: { field: string; message: string }[]
  }
}

export function ok<T>(data: T, message?: string, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ data, ...(message && { message }) }, { status })
}

export function created<T>(data: T, message?: string): NextResponse<ApiSuccessResponse<T>> {
  return ok(data, message, 201)
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

export function handleError(err: unknown): NextResponse<ApiErrorResponse> {
  // Erros de domínio conhecidos
  if (err instanceof UnauthorizedError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message } },
      { status: 401 }
    )
  }

  if (err instanceof TenantMismatchError || err instanceof ForbiddenError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message } },
      { status: 403 }
    )
  }

  if (err instanceof NotFoundError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message } },
      { status: 404 }
    )
  }

  if (err instanceof ConflictError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message } },
      { status: 409 }
    )
  }

  if (err instanceof BusinessError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message } },
      { status: 422 }
    )
  }

  // Erros de validação Zod
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }))
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados de entrada inválidos',
          details,
        },
      },
      { status: 422 }
    )
  }

  // Erro genérico — não expor detalhes em produção
  console.error('[API Error]', err)
  const message =
    process.env.NODE_ENV === 'development' && err instanceof Error
      ? err.message
      : 'Erro interno do servidor'

  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message } },
    { status: 500 }
  )
}
