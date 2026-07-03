import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { ForbiddenError, NotFoundError, BusinessError, assertSameTenant } from '@/lib/permissions'
import { z } from 'zod'

const updateSchema = z.object({ name: z.string().min(1, 'Nome obrigatório').max(255) })

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)) throw new ForbiddenError()

    const group = await prisma.worksiteGroup.findUnique({ where: { id: params.id } })
    if (!group) throw new NotFoundError('Grupo não encontrado')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, group.companyId)

    const body = await req.json()
    const { name } = updateSchema.parse(body)
    const updated = await prisma.worksiteGroup.update({ where: { id: params.id }, data: { name } })
    return ok(updated, 'Grupo atualizado')
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)) throw new ForbiddenError()

    const group = await prisma.worksiteGroup.findUnique({
      where: { id: params.id },
      include: { _count: { select: { worksites: true } } },
    })
    if (!group) throw new NotFoundError('Grupo não encontrado')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, group.companyId)

    if (group._count.worksites > 0) {
      throw new BusinessError(
        `Este grupo possui ${group._count.worksites} obra(s). Reatribua as obras antes de remover.`,
        'GROUP_HAS_WORKSITES'
      )
    }

    await prisma.worksiteGroup.delete({ where: { id: params.id } })
    return ok(null, 'Grupo removido')
  } catch (err) {
    return handleError(err)
  }
}
