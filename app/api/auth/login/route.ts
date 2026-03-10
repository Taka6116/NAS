import { NextRequest, NextResponse } from 'next/server'
import { createAuthCookie, getAuthCookieName } from '@/lib/auth'

function getPassword(): string {
  const b64 = process.env.AUTH_PASSWORD_B64?.trim()
  if (b64) {
    try {
      return Buffer.from(b64, 'base64').toString('utf8')
    } catch {
      // fallback to plain
    }
  }
  return process.env.AUTH_PASSWORD?.trim() ?? ''
}

export async function POST(request: NextRequest) {
  const email = process.env.AUTH_EMAIL?.trim()
  const password = getPassword()

  if (!email || !password) {
    return NextResponse.json(
      { error: '認証が設定されていません' },
      { status: 500 }
    )
  }

  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'リクエスト形式が不正です' },
      { status: 400 }
    )
  }

  const inputEmail = String(body.email ?? '').trim()
  const inputPassword = String(body.password ?? '').trim()

  const emailMatch = inputEmail === email
  const passwordMatch = inputPassword === password

  if (!emailMatch || !passwordMatch) {
    const res: { error: string; debug?: Record<string, number> } = {
      error: 'メールアドレスまたはパスワードが正しくありません',
    }
    if (process.env.NODE_ENV === 'development') {
      res.debug = {
        設定メール長: email?.length ?? 0,
        入力メール長: inputEmail.length,
        設定PW長: password?.length ?? 0,
        入力PW長: inputPassword.length,
      }
    }
    return NextResponse.json(res, { status: 401 })
  }

  const cookieValue = createAuthCookie()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(getAuthCookieName(), cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7日
  })
  return res
}
