import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = `${process.env.EMAIL_FROM_NAME ?? 'Diário de Obras'} <${process.env.EMAIL_FROM ?? 'noreply@diariobras.com'}>`
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface SendEmailResult {
  success: boolean
  error?: string
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string
): Promise<SendEmailResult> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Redefinição de senha — Diário de Obras',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Redefinição de Senha</h2>
          <p>Olá, <strong>${name}</strong>.</p>
          <p>Você solicitou a redefinição de senha. Clique no botão abaixo para criar uma nova senha.</p>
          <p>
            <a href="${resetUrl}"
               style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
              Redefinir senha
            </a>
          </p>
          <p style="color:#6b7280;font-size:14px;">
            Este link expira em 1 hora. Se você não solicitou a redefinição, ignore este e-mail.
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
          <p style="color:#9ca3af;font-size:12px;">Diário de Obras SaaS</p>
        </div>
      `,
    })
    return { success: true }
  } catch (err) {
    console.error('[Email] Falha ao enviar e-mail de reset:', err)
    return { success: false, error: 'Falha ao enviar e-mail' }
  }
}

export async function sendInviteEmail(
  to: string,
  name: string,
  companyName: string,
  token: string
): Promise<SendEmailResult> {
  const inviteUrl = `${APP_URL}/accept-invite?token=${token}`

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Convite para ${companyName} — Diário de Obras`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Você foi convidado!</h2>
          <p>Olá, <strong>${name}</strong>.</p>
          <p>Você recebeu um convite para acessar o sistema <strong>${companyName}</strong> no Diário de Obras.</p>
          <p>
            <a href="${inviteUrl}"
               style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
              Aceitar convite
            </a>
          </p>
          <p style="color:#6b7280;font-size:14px;">
            Este convite expira em 72 horas.
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
          <p style="color:#9ca3af;font-size:12px;">Diário de Obras SaaS</p>
        </div>
      `,
    })
    return { success: true }
  } catch (err) {
    console.error('[Email] Falha ao enviar convite:', err)
    return { success: false, error: 'Falha ao enviar e-mail' }
  }
}
