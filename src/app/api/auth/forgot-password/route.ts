import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, handleError } from '@/lib/api-response'
import { forgotPasswordSchema } from '@/lib/validations/auth'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = forgotPasswordSchema.parse(body)

    // Resposta sempre 200 para não revelar se e-mail existe
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, isActive: true },
    })

    if (user && user.isActive) {
      // Invalida tokens anteriores
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      })

      // Gera token seguro
      const rawToken = crypto.randomBytes(32).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
        },
      })

      await sendPasswordResetEmail(user.email, user.name, rawToken)
    }

    return ok(
      null,
      'Se o e-mail existir na plataforma, você receberá as instruções em breve.'
    )
  } catch (err) {
    return handleError(err)
  }
}
