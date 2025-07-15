import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Permitir acesso a todas as rotas durante o desenvolvimento e build
  if (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview') {
    return NextResponse.next()
  }

  // Em produção, aplicar lógica de middleware mais simples
  const { pathname } = request.nextUrl

  // Permitir acesso direto a arquivos estáticos e APIs
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
}
