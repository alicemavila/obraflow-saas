import type { UserRole, DailyLogStatus, WorksiteStatus } from '@prisma/client'
import { prisma } from '@/lib/db'

// ─── Tipos auxiliares ────────────────────────────────────────────────────────

export interface SessionUser {
  id: string
  role: UserRole
  companyId?: string
}

// ─── Verificações de role global ─────────────────────────────────────────────

export function isSuperAdmin(user: SessionUser): boolean {
  return user.role === 'SUPER_ADMIN'
}

export function isAdminEmpresa(user: SessionUser): boolean {
  return user.role === 'ADMIN_EMPRESA'
}

export function isGestorObra(user: SessionUser): boolean {
  return user.role === 'GESTOR_OBRA'
}

export function isColaborador(user: SessionUser): boolean {
  return user.role === 'COLABORADOR'
}

export function isClienteSindico(user: SessionUser): boolean {
  return user.role === 'CLIENTE_SINDICO'
}

export function hasAdminAccess(user: SessionUser): boolean {
  return isSuperAdmin(user) || isAdminEmpresa(user)
}

export function canManageUsers(user: SessionUser): boolean {
  return isSuperAdmin(user) || isAdminEmpresa(user)
}

export function canManageWorksites(user: SessionUser): boolean {
  return isSuperAdmin(user) || isAdminEmpresa(user)
}

export function canCreateDailyLog(user: SessionUser): boolean {
  return !isClienteSindico(user)
}

export function canSubmitDailyLog(user: SessionUser): boolean {
  return isSuperAdmin(user) || isAdminEmpresa(user) || isGestorObra(user)
}

export function canApproveDailyLog(user: SessionUser): boolean {
  return isSuperAdmin(user) || isAdminEmpresa(user) || isGestorObra(user)
}

export function canGenerateReport(user: SessionUser): boolean {
  return !isColaborador(user)
}

export function canViewAuditLog(user: SessionUser): boolean {
  return isSuperAdmin(user) || isAdminEmpresa(user)
}

// ─── Verificações de tenant ───────────────────────────────────────────────────

/**
 * Verifica se o usuário pertence ao tenant do recurso.
 * SUPER_ADMIN sempre tem acesso.
 */
export function isSameTenant(user: SessionUser, resourceCompanyId: string): boolean {
  if (isSuperAdmin(user)) return true
  return user.companyId === resourceCompanyId
}

/**
 * Lança erro se o usuário não pertence ao tenant.
 */
export function assertSameTenant(user: SessionUser, resourceCompanyId: string): void {
  if (!isSameTenant(user, resourceCompanyId)) {
    throw new TenantMismatchError()
  }
}

// ─── Verificações de associação obra/usuário ──────────────────────────────────

/**
 * Verifica se o usuário está associado à obra.
 * ADMIN_EMPRESA e SUPER_ADMIN têm acesso a todas as obras da empresa.
 */
export async function isWorksiteAssociated(
  user: SessionUser,
  worksiteId: string
): Promise<boolean> {
  if (isSuperAdmin(user)) return true
  if (isAdminEmpresa(user)) {
    // Admin acessa qualquer obra da empresa
    const worksite = await prisma.worksite.findFirst({
      where: { id: worksiteId, companyId: user.companyId! },
      select: { id: true },
    })
    return !!worksite
  }

  // Para demais roles, precisa estar na tabela WorksiteUser
  const assoc = await prisma.worksiteUser.findFirst({
    where: { worksiteId, userId: user.id },
    select: { id: true },
  })
  return !!assoc
}

/**
 * Verifica se o usuário pode editar um diário específico.
 * Considera status do diário e papel do usuário.
 */
export function canEditDailyLog(
  user: SessionUser,
  logStatus: DailyLogStatus,
  logCreatedById: string
): boolean {
  if (logStatus === 'APROVADO') return false // ninguém edita diário aprovado
  if (isSuperAdmin(user) || isAdminEmpresa(user)) return true
  if (isGestorObra(user)) return true
  if (isColaborador(user)) return logCreatedById === user.id // apenas o próprio
  return false
}

/**
 * Verifica se o usuário pode fazer upload de arquivo.
 */
export function canUploadFile(user: SessionUser): boolean {
  return !isClienteSindico(user)
}

/**
 * Verifica se a obra está em estado que aceita diários.
 */
export function worksiteAcceptsDailyLog(status: WorksiteStatus): boolean {
  return status === 'EM_ANDAMENTO'
}

// ─── Erros de autorização ────────────────────────────────────────────────────

export class UnauthorizedError extends Error {
  public readonly code = 'UNAUTHORIZED'
  public readonly statusCode = 401
  constructor(message = 'Não autenticado') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  public readonly code = 'FORBIDDEN'
  public readonly statusCode = 403
  constructor(message = 'Acesso negado') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class TenantMismatchError extends Error {
  public readonly code = 'TENANT_MISMATCH'
  public readonly statusCode = 403
  constructor(message = 'Acesso negado: recurso pertence a outra empresa') {
    super(message)
    this.name = 'TenantMismatchError'
  }
}

export class NotFoundError extends Error {
  public readonly code = 'NOT_FOUND'
  public readonly statusCode = 404
  constructor(message = 'Recurso não encontrado') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  public readonly code: string
  public readonly statusCode = 409
  constructor(message: string, code = 'CONFLICT') {
    super(message)
    this.code = code
    this.name = 'ConflictError'
  }
}

export class BusinessError extends Error {
  public readonly code: string
  public readonly statusCode = 422
  constructor(message: string, code = 'BUSINESS_ERROR') {
    super(message)
    this.code = code
    this.name = 'BusinessError'
  }
}
