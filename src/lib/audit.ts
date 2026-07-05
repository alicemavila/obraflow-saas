import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'
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
        payload: safePayload as Prisma.InputJsonValue | undefined,
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

const REDACTED = '[REDACTED]'
const MAX_AUDIT_STRING_LENGTH = 500
const MAX_AUDIT_DEPTH = 4

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passwordhash/i,
  /token/i,
  /secret/i,
  /api[-_]?key/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /credential/i,
  /private[-_]?key/i,
  /cpf/i,
  /email/i,
  /phone|telefone/i,
]

const LARGE_OR_CONTENT_KEY_PATTERNS = [
  /content|conteudo/i,
  /body/i,
  /document/i,
  /filecontent/i,
  /base64/i,
  /raw/i,
  /notes|observa/i,
  /description|descricao/i,
  /comment|comentario/i,
  /address|endereco/i,
]

/** Remove campos sensíveis do payload antes de salvar no log */
function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  return sanitizeObject(payload, 0)
}

function sanitizeObject(payload: Record<string, unknown>, depth: number): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    sanitized[key] = sanitizeValue(key, value, depth)
  }
  return sanitized
}

function sanitizeValue(key: string, value: unknown, depth: number): unknown {
  if (isSensitiveKey(key) || isLargeContentKey(key)) return REDACTED
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'string') return sanitizeString(value)
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) {
    if (depth >= MAX_AUDIT_DEPTH) return '[TRUNCATED]'
    return value.map((item) => sanitizeValue(key, item, depth + 1))
  }
  if (typeof value === 'object') {
    if (depth >= MAX_AUDIT_DEPTH) return '[TRUNCATED]'
    return sanitizeObject(value as Record<string, unknown>, depth + 1)
  }
  return String(value)
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))
}

function isLargeContentKey(key: string): boolean {
  return LARGE_OR_CONTENT_KEY_PATTERNS.some((pattern) => pattern.test(key))
}

function sanitizeString(value: string): string {
  if (looksLikeSecret(value) || value.length > MAX_AUDIT_STRING_LENGTH) return REDACTED
  return value
}

function looksLikeSecret(value: string): boolean {
  return (
    /^Bearer\s+/i.test(value) ||
    /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value) ||
    /^re_[A-Za-z0-9_-]{20,}$/.test(value)
  )
}
