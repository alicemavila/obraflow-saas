import type { AttachmentEntityType} from '@prisma/client';
import { type UserRole } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  assertSameTenant,
  isWorksiteAssociated,
  ForbiddenError,
  NotFoundError,
  BusinessError,
  type SessionUser,
} from '@/lib/permissions'

type AttachmentTarget = {
  companyId: string
  entityType: AttachmentEntityType
  entityId: string
}

function assertTenant(user: SessionUser, companyId: string) {
  if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, companyId)
}

async function assertAssociated(user: SessionUser, worksiteId: string) {
  const associated = await isWorksiteAssociated(user, worksiteId)
  if (!associated) throw new ForbiddenError()
}

function assertCompanyUser(user: SessionUser) {
  if (user.role !== 'SUPER_ADMIN' && !user.companyId) {
    throw new ForbiddenError('Usuário sem empresa não pode anexar arquivos')
  }
}

export async function authorizeAttachmentTarget(
  user: SessionUser,
  entityType: AttachmentEntityType,
  entityId: string
): Promise<AttachmentTarget> {
  assertCompanyUser(user)

  if (entityType === 'DAILY_LOG') {
    const log = await prisma.dailyLog.findUnique({
      where: { id: entityId },
      select: { id: true, companyId: true, worksiteId: true, status: true },
    })
    if (!log) throw new NotFoundError('Diário não encontrado')
    assertTenant(user, log.companyId)
    await assertAssociated(user, log.worksiteId)
    if (log.status === 'APROVADO') {
      throw new BusinessError('Não é possível anexar arquivos a diários aprovados', 'DIARY_ALREADY_APPROVED')
    }
    return { companyId: log.companyId, entityType, entityId: log.id }
  }

  if (entityType === 'ACTIVITY') {
    const activity = await prisma.activity.findUnique({
      where: { id: entityId },
      select: {
        id: true,
        companyId: true,
        dailyLog: { select: { worksiteId: true, status: true } },
      },
    })
    if (!activity) throw new NotFoundError('Atividade não encontrada')
    assertTenant(user, activity.companyId)
    await assertAssociated(user, activity.dailyLog.worksiteId)
    if (activity.dailyLog.status === 'APROVADO') {
      throw new BusinessError('Não é possível anexar arquivos a diários aprovados', 'DIARY_ALREADY_APPROVED')
    }
    return { companyId: activity.companyId, entityType, entityId: activity.id }
  }

  if (entityType === 'OCCURRENCE') {
    const occurrence = await prisma.occurrence.findUnique({
      where: { id: entityId },
      select: {
        id: true,
        companyId: true,
        dailyLog: { select: { worksiteId: true, status: true } },
      },
    })
    if (!occurrence) throw new NotFoundError('Ocorrência não encontrada')
    assertTenant(user, occurrence.companyId)
    await assertAssociated(user, occurrence.dailyLog.worksiteId)
    if (occurrence.dailyLog.status === 'APROVADO') {
      throw new BusinessError('Não é possível anexar arquivos a diários aprovados', 'DIARY_ALREADY_APPROVED')
    }
    return { companyId: occurrence.companyId, entityType, entityId: occurrence.id }
  }

  if (entityType === 'WORKSITE') {
    const worksite = await prisma.worksite.findUnique({
      where: { id: entityId },
      select: { id: true, companyId: true },
    })
    if (!worksite) throw new NotFoundError('Obra não encontrada')
    assertTenant(user, worksite.companyId)
    await assertAssociated(user, worksite.id)
    return { companyId: worksite.companyId, entityType, entityId: worksite.id }
  }

  if (entityType === 'USER') {
    const targetUser = await prisma.user.findUnique({
      where: { id: entityId },
      select: { id: true, companyId: true },
    })
    if (!targetUser?.companyId) throw new NotFoundError('Usuário não encontrado')
    assertTenant(user, targetUser.companyId)

    const canAttachToUser =
      user.id === targetUser.id ||
      (['SUPER_ADMIN', 'ADMIN_EMPRESA'] as UserRole[]).includes(user.role)
    if (!canAttachToUser) throw new ForbiddenError()

    return { companyId: targetUser.companyId, entityType, entityId: targetUser.id }
  }

  throw new BusinessError('Tipo de entidade não suportado para anexos', 'UNSUPPORTED_ATTACHMENT_TARGET')
}

export function assertStorageKeyMatchesTarget(storageKey: string, target: AttachmentTarget) {
  const entityPath = target.entityType.toLowerCase().replace('_', '-')
  const expectedPrefix = `companies/${target.companyId}/${entityPath}/${target.entityId}/`
  if (!storageKey.startsWith(expectedPrefix)) {
    throw new ForbiddenError('Chave de armazenamento não pertence à entidade informada')
  }
}
