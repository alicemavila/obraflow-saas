import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { ForbiddenError, NotFoundError, assertSameTenant } from '@/lib/permissions'
import { updateWorksiteSchema } from '@/lib/validations/worksite'
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

    const worksite = await getWorksiteOrThrow(
      params.id,
      user.role !== 'SUPER_ADMIN' ? user.companyId : undefined
    )

    const body = await req.json()
    const data = updateWorksiteSchema.parse(body)

    const updated = await prisma.worksite.update({
      where: { id: params.id },
      data: {
        ...data,
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDateForecast && { endDateForecast: new Date(data.endDateForecast) }),
      },
    })

    await logAuditEvent({
      userId: user.id,
      companyId: worksite.companyId,
      action: 'worksite.updated',
      entityType: 'Worksite',
      entityId: params.id,
      payload: data as Record<string, unknown>,
      req,
    })

    return ok(updated, 'Obra atualizada com sucesso')
  } catch (err) {
    return handleError(err)
  }
}
