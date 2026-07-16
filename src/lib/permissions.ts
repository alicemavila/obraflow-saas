import type {
  DailyLogStatus,
  UserRole,
  WorksiteStatus,
} from '@prisma/client'

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
  return (
    isSuperAdmin(user) ||
    isAdminEmpresa(user) ||
    isGestorObra(user)
  )
}

export function canApproveDailyLog(user: SessionUser): boolean {
  return (
    isSuperAdmin(user) ||
    isAdminEmpresa(user) ||
    isGestorObra(user)
  )
}

export function canGenerateReport(user: SessionUser): boolean {
  return !isColaborador(user)
}

export function canViewAuditLog(user: SessionUser): boolean {
  return isSuperAdmin(user) || isAdminEmpresa(user)
}

// ─── Verificações de tenant ──────────────────────────────────────────────────

/**
 * Verifica se o usuário pertence ao tenant do recurso.
 *
 * SUPER_ADMIN pode acessar recursos de qualquer empresa.
 */
export function isSameTenant(
  user: SessionUser,
  resourceCompanyId: string,
): boolean {
  if (isSuperAdmin(user)) {
    return true
  }

  return Boolean(
    user.companyId &&
      user.companyId === resourceCompanyId,
  )
}

/**
 * Interrompe a operação quando o recurso pertence a outro tenant.
 */
export function assertSameTenant(
  user: SessionUser,
  resourceCompanyId: string,
): void {
  if (!isSameTenant(user, resourceCompanyId)) {
    throw new TenantMismatchError()
  }
}

// ─── Verificações de associação obra/usuário ─────────────────────────────────

/**
 * Verifica se o usuário pode acessar uma obra.
 *
 * Regras:
 * - SUPER_ADMIN pode acessar qualquer obra existente;
 * - ADMIN_EMPRESA pode acessar qualquer obra da própria empresa;
 * - demais perfis precisam estar associados à obra;
 * - a associação precisa pertencer à mesma empresa da sessão.
 */
export async function isWorksiteAssociated(
  user: SessionUser,
  worksiteId: string,
): Promise<boolean> {
  if (isSuperAdmin(user)) {
    const worksite = await prisma.worksite.findUnique({
      where: {
        id: worksiteId,
      },
      select: {
        id: true,
      },
    })

    return Boolean(worksite)
  }

  /*
   * Todo usuário que não seja SUPER_ADMIN precisa possuir companyId.
   * Uma sessão sem empresa não pode acessar recursos de obras.
   */
  if (!user.companyId) {
    return false
  }

  if (isAdminEmpresa(user)) {
    const worksite = await prisma.worksite.findFirst({
      where: {
        id: worksiteId,
        companyId: user.companyId,
      },
      select: {
        id: true,
      },
    })

    return Boolean(worksite)
  }

  /*
   * Gestor, colaborador e cliente/síndico precisam estar associados
   * à obra dentro da mesma empresa da sessão.
   */
  const association = await prisma.worksiteUser.findFirst({
    where: {
      worksiteId,
      userId: user.id,
      companyId: user.companyId,
    },
    select: {
      id: true,
    },
  })

  return Boolean(association)
}

/**
 * Interrompe a operação quando o usuário não pode acessar a obra.
 *
 * Retorna 404 em vez de 403 para não revelar a existência de uma obra
 * pertencente a outra empresa ou à qual o usuário não está associado.
 */
export async function assertWorksiteAccess(
  user: SessionUser,
  worksiteId: string,
): Promise<void> {
  const hasAccess = await isWorksiteAssociated(
    user,
    worksiteId,
  )

  if (!hasAccess) {
    throw new NotFoundError('Obra não encontrada')
  }
}

// ─── Verificações dos diários ────────────────────────────────────────────────

/**
 * Verifica se o usuário pode editar um diário específico.
 *
 * A associação à obra deve ser validada separadamente antes desta função.
 */
export function canEditDailyLog(
  user: SessionUser,
  logStatus: DailyLogStatus,
  logCreatedById: string,
): boolean {
  /*
   * Um diário aprovado não pode ser editado por nenhum perfil.
   */
  if (logStatus === 'APROVADO') {
    return false
  }

  if (isSuperAdmin(user) || isAdminEmpresa(user)) {
    return true
  }

  if (isGestorObra(user)) {
    return true
  }

  /*
   * COLABORADOR pode editar apenas o diário criado por ele,
   * desde que esteja associado à obra.
   */
  if (isColaborador(user)) {
    return logCreatedById === user.id
  }

  return false
}

/**
 * Verifica se o usuário pode fazer upload de arquivos.
 *
 * A autorização sobre a obra ou diário relacionado deve ser validada
 * separadamente.
 */
export function canUploadFile(user: SessionUser): boolean {
  return !isClienteSindico(user)
}

/**
 * Verifica se a obra está em um status que permite novos diários.
 */
export function worksiteAcceptsDailyLog(
  status: WorksiteStatus,
): boolean {
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

  constructor(
    message = 'Acesso negado: recurso pertence a outra empresa',
  ) {
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

  constructor(
    message: string,
    code = 'CONFLICT',
  ) {
    super(message)
    this.code = code
    this.name = 'ConflictError'
  }
}

export class BusinessError extends Error {
  public readonly code: string
  public readonly statusCode = 422

  constructor(
    message: string,
    code = 'BUSINESS_ERROR',
  ) {
    super(message)
    this.code = code
    this.name = 'BusinessError'
  }
}