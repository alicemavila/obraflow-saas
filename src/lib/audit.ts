import { prisma } from '@/lib/db'
import type { NextRequest } from 'next/server'

interface AuditEventParams {
  userId?: string | null
  companyId?: string | null
  userEmail?: string | null
  action: string
  entityType: string
  entityId?: string | null
  payload?: Record<string, unknown> | null
  req?: NextRequest | null
  ipAddress?: string
  userAgent?: string
}

/**
 * Registra um evento de auditoria no banco de dados.
 * Nunca lança exceção — falha silenciosa para não bloquear a operação principal.
 */
export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    const ip = params.ipAddress ?? getIpFromRequest(params.req) ?? '0.0.0.0'
    const ua = params.userAgent ?? params.req?.headers.get('user-agent') ?? 'unknown'

    // Sanitiza payload para não logar dados sensíveis
    const safePayload = params.payload ? sanitizePayload(params.payload) : null

    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        companyId: params.companyId ?? null,
        userEmail: params.userEmail ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        payload: safePayload,
        ipAddress: ip,
        userAgent: ua.substring(0, 500),
      },
    })
  } catch (err) {
    // Log no console mas não lança — auditoria não deve bloquear o fluxo
    console.error('[AuditLog] Falha ao registrar evento:', params.action, err)
  }
}

function getIpFromRequest(req?: NextRequest | null): string | undefined {
  if (!req) return undefined
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '0.0.0.0'
  )
}

/** Remove campos sensíveis do payload antes de salvar no log */
function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const SENSITIVE_KEYS = ['password', 'passwordHash', 'token', 'secret', 'apiKey']
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]'
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}
