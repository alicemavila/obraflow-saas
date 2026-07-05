import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rotas públicas que não precisam de autenticação
const PUBLIC_ROUTES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/accept-invite',
  '/api/auth',
  '/api/health',
  '/privacy',
  '/terms',
]

// Rotas exclusivas para admins internos
const ADMIN_ONLY_ROUTES = ['/admin/super']

export default auth((req: NextRequest & { auth: { user?: { role?: string; companyId?: string } } | null }) => {
  const { pathname } = req.nextUrl

  // Permite rotas públicas
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Permite assets estáticos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/logo') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const session = req.auth
  const user = session?.user

  // Redireciona para login se não autenticado
  if (!user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = user.role

  // CLIENTE_SINDICO só pode acessar /client e /api/client
  if (role === 'CLIENTE_SINDICO') {
    if (
      !pathname.startsWith('/client') &&
      !pathname.startsWith('/api/client') &&
      !pathname.startsWith('/api/auth')
    ) {
      return NextResponse.redirect(new URL('/client', req.url))
    }
  }

  // Não-clientes não podem acessar /client
  if (pathname.startsWith('/client') && role !== 'CLIENTE_SINDICO') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Rotas de super admin
  if (ADMIN_ONLY_ROUTES.some((r) => pathname.startsWith(r)) && role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Injeta companyId no header para uso nas Route Handlers
  const response = NextResponse.next()
  if (user.companyId) {
    response.headers.set('x-company-id', user.companyId)
  }
  response.headers.set('x-user-id', (user as { id?: string }).id ?? '')
  response.headers.set('x-user-role', role ?? '')

  return response
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|robots.txt|sitemap.xml).*)',
  ],
}
