import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/AppLayout'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role === 'CLIENTE_SINDICO') redirect('/client')

  // Fetch company name for the header
  let companyName: string | undefined
  if (session.user.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { name: true },
    })
    companyName = company?.name ?? undefined
  }

  return (
    <AppLayout user={session.user} companyName={companyName}>
      {children}
    </AppLayout>
  )
}
