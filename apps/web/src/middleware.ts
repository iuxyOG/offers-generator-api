import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = ['/login', '/api/auth']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = req.cookies.get('auth_token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'shopee-saas-secret-dev')
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    // Token inválido ou expirado — limpar cookie e redirecionar
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.set('auth_token', '', { path: '/', maxAge: 0 })
    return res
  }
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
}
