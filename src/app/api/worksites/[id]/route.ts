import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { ForbiddenError, NotFoundError, BusinessError, assertSameTenant } from '@/lib/permissions'
import { updateWorksiteSchema, calculateWorksiteProfileCompletion } from '@/lib/validations/worksite'
import { logAuditEvent } from '@/lib/audit'

async function getWorksiteOrThrow(id: string, companyId?: string) {
  const w = await prisma.worksite.findFirst({
    where: { id, ...(companyId && { companyId }) },
  })
  if (!w) throw new NotFoundError('Obra não encontrada')
  return w
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()

    const worksite = await prisma.worksite.findUnique({
      where: { id: params.id },
      include: {
        createdBy: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
        worksiteUsers: {
          include: { user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } } },
        },
        _count: { select: { dailyLogs: true } },
      },
    })

    if (!worksite) throw new NotFoundError('Obra não encontrada')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, worksite.companyId)

    return ok(worksite)
  } catch (err) {
    return handleError(err)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)) throw new ForbiddenError()

    const existing = await getWorksiteOrThrow(
      params.id,
      user.role !== 'SUPER_ADMIN' ? user.companyId : undefined
    )

    const body = await req.json()
    const data = updateWorksiteSchema.parse(body)

    // Validate groupId belongs to same company
    if (data.groupId) {
      const group = await prisma.worksiteGroup.findFirst({
        where: { id: data.groupId, companyId: existing.companyId },
        select: { id: true },
      })
      if (!group) throw new BusinessError('Grupo não encontrado nesta empresa', 'GROUP_NOT_FOUND')
    }

    // Merge with existing to recalculate isProfileComplete
    const mergedName = data.name ?? existing.name
    const mergedStatus = data.status ?? existing.status
    const mergedGroupId = data.groupId !== undefined ? data.groupId : existing.groupId
    const mergedResponsible = data.responsibleName !== undefined ? data.responsibleName : existing.responsibleName
    const mergedStartDate = data.startDate !== undefined ? data.startDate : existing.startDate
    const mergedEndDate = data.endDateForecast !== undefined ? data.endDateForecast : existing.endDateForecast
    const mergedMode = data.registrationMode ?? existing.registrationMode

    const isProfileComplete = calculateWorksiteProfileCompletion({
      name: mergedName,
      status: mergedStatus,
      groupId: mergedGroupId,
      responsibleName: mergedResponsible,
      startDate: mergedStartDate,
      endDateForecast: mergedEndDate,
      registrationMode: mergedMode,
    })

    const updated = await prisma.worksite.update({
      where: { id: params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.registrationMode !== undefined && { registrationMode: data.registrationMode }),
        ...(data.responsibleName !== undefined && { responsibleName: data.responsibleName || null }),
        ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
        ...(data.endDateForecast !== undefined && { endDateForecast: data.endDateForecast ? new Date(data.endDateForecast) : null }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.neighborhood !== undefined && { neighborhood: data.neighborhood || null }),
        ...(data.city !== undefined && { city: data.city || null }),
        ...(data.state !== undefined && { state: data.state || null }),
        ...(data.cep !== undefined && { cep: data.cep || null }),
        ...(data.artNumber !== undefined && { artNumber: data.artNumber || null }),
        ...(data.responsibleCrea !== undefined && { responsibleCrea: data.responsibleCrea || null }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.clientName !== undefined && { clientName: data.clientName || null }),
        ...(data.contractNumber !== undefined && { contractNumber: data.contractNumber || null }),
        ...(data.contractType !== undefined && { contractType: data.contractType || null }),
        ...(data.totalArea !== undefined && { totalArea: data.totalArea ?? null }),
        ...(data.groupId !== undefined && { groupId: data.groupId || null }),
        ...(data.hasTaskList !== undefined && { hasTaskList: data.hasTaskList }),
        isProfileComplete,
      },
    })

    await logAuditEvent({
      userId: user.id,
      companyId: existing.companyId,
      action: 'worksite.updated',
      entityType: 'Worksite',
      entityId: params.id,
      payload: { ...data as Record<string, unknown>, isProfileComplete },
      req,
    })

    return ok(updated, 'Obra atualizada com sucesso')
  } catch (err) {
    return handleError(err)
  }
}
