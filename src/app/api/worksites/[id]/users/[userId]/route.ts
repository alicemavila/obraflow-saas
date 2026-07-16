import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { ForbiddenError, NotFoundError, assertSameTenant } from '@/lib/permissions'

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string; userId: string }> }
) {
  const params = await props.params;
  try {
    const currentUser = await getCurrentUser()
    if (!['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(currentUser.role)) throw new ForbiddenError()

    const worksite = await prisma.worksite.findUnique({ where: { id: params.id } })
    if (!worksite) throw new NotFoundError('Obra não encontrada')
    if (currentUser.role !== 'SUPER_ADMIN') assertSameTenant(currentUser, worksite.companyId)

    const wu = await prisma.worksiteUser.findUnique({
      where: { worksiteId_userId: { worksiteId: params.id, userId: params.userId } },
    })
    if (!wu) throw new NotFoundError('Associação não encontrada')

    await prisma.worksiteUser.delete({
      where: { worksiteId_userId: { worksiteId: params.id, userId: params.userId } },
    })

    return ok(null, 'Usuário removido da obra')
  } catch (err) {
    return handleError(err)
  }
}
