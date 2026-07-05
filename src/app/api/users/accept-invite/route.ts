import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { created, handleError } from '@/lib/api-response'
import { BusinessError } from '@/lib/permissions'
import { acceptInviteSchema } from '@/lib/validations/user'
import { logAuditEvent } from '@/lib/audit'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, password } = acceptInviteSchema.parse(body)

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const invite = await prisma.inviteToken.findUnique({
      where: { tokenHash },
      include: { company: true },
    })

    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new BusinessError('Convite inválido ou expirado', 'INVALID_TOKEN')
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const newUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          companyId: invite.companyId,
          email: invite.email,
          passwordHash,
          name: body.name ?? invite.email.split('@')[0],
          role: invite.role,
          isActive: true,
          emailVerifiedAt: new Date(),
        },
      })

      await tx.inviteToken.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      })

      return u
    })

    await logAuditEvent({
      userId: newUser.id,
      companyId: invite.companyId,
      userEmail: newUser.email,
      action: 'user.created',
      entityType: 'User',
      entityId: newUser.id,
      payload: { role: newUser.role, viainvite: true },
      req,
    })

    return created(
      { userId: newUser.id, email: newUser.email },
      'Conta criada com sucesso. Faça login para continuar.'
    )
  } catch (err) {
    return handleError(err)
  }
}
