import { auth } from '@/lib/auth'
import {
  UnauthorizedError,
  ForbiddenError,
  type SessionUser,
} from '@/lib/permissions'
import type { UserRole } from '@prisma/client'

/**
 * Retorna o usuário da sessão atual.
 * Lança UnauthorizedError se não autenticado.
 */
export async function getCurrentUser(): Promise<SessionUser> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new UnauthorizedError()
  }
  return {
    id: session.user.id,
    role: session.user.role,
    companyId: session.user.companyId,
  }
}

/**
 * Retorna a sessão ou null (sem lançar erro).
 */
export async function getOptionalUser(): Promise<SessionUser | null> {
  try {
    return await getCurrentUser()
  } catch {
    return null
  }
}

/**
 * Garante que o usuário tem ao menos um dos roles indicados.
 */
export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!roles.includes(user.role)) {
    throw new ForbiddenError(`Acesso restrito para: ${roles.join(', ')}`)
  }
  return user
}

/**
 * Garante que o usuário é SUPER_ADMIN.
 */
export async function requireSuperAdmin(): Promise<SessionUser> {
  return requireRole('SUPER_ADMIN')
}

/**
 * Garante que o usuário é ADMIN_EMPRESA ou superior.
 */
export async function requireAdmin(): Promise<SessionUser> {
  return requireRole('SUPER_ADMIN', 'ADMIN_EMPRESA')
}

/**
 * Garante que o usuário pode gerenciar obras (admin ou superior).
 */
export async function requireWorksiteManager(): Promise<SessionUser> {
  return requireRole('SUPER_ADMIN', 'ADMIN_EMPRESA')
}

/**
 * Garante que o usuário pode criar diários.
 */
export async function requireDailyLogCreator(): Promise<SessionUser> {
  return requireRole('SUPER_ADMIN', 'ADMIN_EMPRESA', 'GESTOR_OBRA', 'COLABORADOR')
}
