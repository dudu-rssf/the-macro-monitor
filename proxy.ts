import { NextRequest, NextResponse } from 'next/server'

export function proxy(req: NextRequest) {
  const password = process.env.SITE_PASSWORD
  // If no password configured, allow all access
  if (!password) return NextResponse.next()

  const { pathname } = req.nextUrl

  // Always allow login page and auth API
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  const cookie = req.cookies.get('macro-auth')?.value
  if (cookie === password) return NextResponse.next()

  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt).*)',
  ],
}
