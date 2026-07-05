import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, handleError } from '@/lib/api-response'
import { resetPasswordSchema } from '@/lib/validations/auth'
import { BusinessError } from '@/lib/permissions'
import { logAuditEvent } from '@/lib/audit'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, password } = resetPasswordSchema.parse(body)

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    })

    if (!resetToken) {
      throw new BusinessError('Token inválido ou expirado', 'INVALID_TOKEN')
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash, passwordChangedAt: new Date() },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ])

    await logAuditEvent({
      userId: resetToken.userId,
      companyId: resetToken.user.companyId,
      userEmail: resetToken.user.email,
      action: 'user.password_reset',
      entityType: 'User',
      entityId: resetToken.userId,
      req,
    })

    return ok(null, 'Senha redefinida com sucesso')
  } catch (err) {
    return handleError(err)
  }
}
