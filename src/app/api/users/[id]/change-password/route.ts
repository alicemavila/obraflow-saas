import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { ForbiddenError, NotFoundError, BusinessError } from '@/lib/permissions'
import { changePasswordSchema } from '@/lib/validations/auth'
import { logAuditEvent } from '@/lib/audit'
import bcrypt from 'bcryptjs'

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const currentUser = await getCurrentUser()
    // Only the user themselves can change their own password
    if (currentUser.id !== params.id) throw new ForbiddenError()

    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, passwordHash: true, companyId: true, email: true },
    })
    if (!target) throw new NotFoundError('Usuário não encontrado')

    const body = await req.json()
    const { currentPassword, newPassword } = changePasswordSchema.parse(body)

    const match = await bcrypt.compare(currentPassword, target.passwordHash)
    if (!match) throw new BusinessError('Senha atual incorreta', 'INVALID_CURRENT_PASSWORD')

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: params.id },
      data: { passwordHash, passwordChangedAt: new Date() },
    })

    await logAuditEvent({
      userId: currentUser.id,
      companyId: target.companyId,
      userEmail: target.email,
      action: 'user.password_changed',
      entityType: 'User',
      entityId: params.id,
      req,
    })

    return ok(null, 'Senha alterada com sucesso')
  } catch (err) {
    return handleError(err)
  }
}
