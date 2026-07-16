import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

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

const ADMIN_ONLY_ROUTES = [
  '/admin/super',
]

const STATIC_FILE_PATTERN = /\.[a-zA-Z0-9]+$/

/**
 * Verifica a rota exata ou qualquer sub-rota.
 *
 * Exemplos:
 * /api/auth corresponde a /api/auth/session
 * /login não corresponde a /login-falso
 */
function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`)
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => matchesRoute(pathname, route))
}

function isAdminOnlyRoute(pathname: string): boolean {
  return ADMIN_ONLY_ROUTES.some((route) =>
    matchesRoute(pathname, route),
  )
}

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/logo') ||
    STATIC_FILE_PATTERN.test(pathname)
  )
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      error: 'Não autenticado',
      message: 'É necessário estar autenticado para acessar este recurso.',
    },
    {
      status: 401,
    },
  )
}

function forbiddenResponse() {
  return NextResponse.json(
    {
      error: 'Acesso negado',
      message: 'Você não possui permissão para acessar este recurso.',
    },
    {
      status: 403,
    },
  )
}

export default auth((req) => {
  const { pathname, search } = req.nextUrl

  if (isPublicRoute(pathname) || isStaticAsset(pathname)) {
    return NextResponse.next()
  }

  const session = req.auth
  const user = session?.user

  /*
   * APIs devem retornar JSON em vez de redirecionamento HTML.
   * Páginas continuam redirecionando para o login.
   */
  if (!user) {
    if (isApiRoute(pathname)) {
      return unauthorizedResponse()
    }

    const loginUrl = new URL('/login', req.url)

    // Mantém também os parâmetros da URL original.
    loginUrl.searchParams.set(
      'callbackUrl',
      `${pathname}${search}`,
    )

    return NextResponse.redirect(loginUrl)
  }

  const role = user.role

  /*
   * Uma sessão autenticada sem perfil é considerada inválida.
   * Isso evita permitir acesso por padrão em caso de token incompleto.
   */
  if (!role) {
    if (isApiRoute(pathname)) {
      return forbiddenResponse()
    }

    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('error', 'invalid-session')

    return NextResponse.redirect(loginUrl)
  }

  /*
   * CLIENTE_SINDICO só pode acessar:
   * - páginas iniciadas por /client;
   * - APIs iniciadas por /api/client.
   *
   * As rotas públicas já foram liberadas anteriormente.
   */
  if (role === 'CLIENTE_SINDICO') {
    const isClientPage = matchesRoute(pathname, '/client')
    const isClientApi = matchesRoute(pathname, '/api/client')

    if (!isClientPage && !isClientApi) {
      if (isApiRoute(pathname)) {
        return forbiddenResponse()
      }

      return NextResponse.redirect(
        new URL('/client', req.url),
      )
    }
  }

  // Usuários internos não podem acessar a área do cliente.
  if (
    matchesRoute(pathname, '/client') &&
    role !== 'CLIENTE_SINDICO'
  ) {
    return NextResponse.redirect(
      new URL('/dashboard', req.url),
    )
  }

  // Rotas exclusivas de SUPER_ADMIN.
  if (
    isAdminOnlyRoute(pathname) &&
    role !== 'SUPER_ADMIN'
  ) {
    return NextResponse.redirect(
      new URL('/dashboard', req.url),
    )
  }

  /*
   * Não adicionamos x-company-id, x-user-id ou x-user-role.
   *
   * Os Route Handlers devem obter o usuário diretamente pela sessão e
   * executar as validações de tenant, perfil e associação com a obra.
   * Headers gerados pelo middleware não devem ser usados como fonte de
   * autorização.
   */
  return NextResponse.next()
})

export const config = {
  /*
   * Necessário porque o fluxo de autenticação importa módulos que usam
   * recursos do Node.js, como Prisma e bcryptjs.
   */
  runtime: 'nodejs',

  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|robots.txt|sitemap.xml).*)',
  ],
}