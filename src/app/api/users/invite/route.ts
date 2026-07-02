import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { created, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { ForbiddenError, ConflictError } from '@/lib/permissions'
import { inviteUserSchema } from '@/lib/validations/user'
import { sendInviteEmail } from '@/lib/email'
import { logAuditEvent } from '@/lib/audit'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)) {
      throw new ForbiddenError()
    }

    const body = await req.json()
    const { email, name, role } = inviteUserSchema.parse(body)

    const companyId = user.role === 'SUPER_ADMIN'
      ? (body.companyId as string)
      : user.companyId!

    // Verifica se usuário já existe
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new ConflictError('Este e-mail já está cadastrado na plataforma', 'EMAIL_IN_USE')
    }

    // Verifica limite do plano
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { _count: { select: { users: { where: { isActive: true } } } } },
    })
    if (company && company._count.users >= company.maxUsers) {
      throw new ConflictError(
        'Limite de usuários do plano atingido. Faça upgrade para convidar mais usuários.',
        'USER_LIMIT_REACHED'
      )
    }

    // Invalida convites anteriores para o mesmo e-mail
    await prisma.inviteToken.updateMany({
      where: { email, companyId, acceptedAt: null },
      data: { expiresAt: new Date() },
    })

    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    const invite = await prisma.inviteToken.create({
      data: {
        companyId,
        invitedByUserId: user.id,
        email,
        role,
        tokenHash,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72h
      },
    })

    const companyRecord = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    })

    await sendInviteEmail(email, name, companyRecord?.name ?? 'sua empresa', rawToken)

    await logAuditEvent({
      userId: user.id,
      companyId,
      userEmail: user.companyId ? undefined : undefined,
      action: 'user.invited',
      entityType: 'InviteToken',
      entityId: invite.id,
      payload: { invitedEmail: email, role },
      req,
    })

    return created({
      inviteId: invite.id,
      email,
      expiresAt: invite.expiresAt,
    }, 'Convite enviado com sucesso')
  } catch (err) {
    return handleError(err)
  }
}
