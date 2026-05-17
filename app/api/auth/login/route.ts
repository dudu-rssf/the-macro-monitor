import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const expected = process.env.SITE_PASSWORD

  if (!expected || password !== expected) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('macro-auth', expected, {
    httpOnly: true,
    secure:   true,
    sameSite: 'strict',
    maxAge:   60 * 60 * 24 * 30, // 30 dias
    path:     '/',
  })
  return res
}
