import type { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const metadata: Metadata = { title: 'Assinatura' }

const PLAN_LABELS = { STARTER: 'Starter', PRO: 'Pro', ENTERPRISE: 'Enterprise' }
const PLAN_FEATURES = {
  STARTER: ['Até 3 obras ativas', 'Até 5 usuários', 'Relatórios básicos em PDF'],
  PRO: ['Obras ilimitadas', 'Até 20 usuários', 'Relatórios avançados', 'Pré-cadastros completos'],
  ENTERPRISE: ['Tudo do Pro', 'Usuários ilimitados', 'SLA dedicado', 'Suporte prioritário'],
}

export default async function AssinaturaPage() {
  const session = await auth()
  const company = session?.user.companyId
    ? await prisma.company.findUnique({
        where: { id: session.user.companyId },
        select: { plan: true, status: true, trialEndsAt: true, maxWorksites: true, maxUsers: true },
      })
    : null

  const plan = company?.plan ?? 'STARTER'
  const features = PLAN_FEATURES[plan]

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Assinatura</h1>
        <p className="text-sm text-gray-500 mt-1">Detalhes do seu plano atual</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Plano atual</p>
              <p className="text-xl font-bold text-gray-900">{PLAN_LABELS[plan]}</p>
            </div>
            <Badge variant={company?.status === 'ACTIVE' ? 'success' : 'muted'}>
              {company?.status === 'ACTIVE' ? 'Ativo' : company?.status ?? 'Inativo'}
            </Badge>
          </div>

          {company?.trialEndsAt && new Date(company.trialEndsAt) > new Date() && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              Período de trial até {new Date(company.trialEndsAt).toLocaleDateString('pt-BR')}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Incluso no plano:</p>
            <ul className="space-y-1">
              {features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-4 h-4 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs flex-shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-2 border-t border-gray-100 text-xs text-gray-400">
            Para fazer upgrade, entre em contato com suporte@obraflow.com.br
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
