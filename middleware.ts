import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Para páginas 404, redirecionar para a nossa página not-found personalizada
  const url = request.nextUrl.clone()
  
  // Se for uma requisição para /404, redirecionar para /not-found
  if (url.pathname === '/404') {
    url.pathname = '/not-found'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
