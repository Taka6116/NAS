'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.error ?? 'ログインに失敗しました'
        const debug = data.debug ? ` [デバッグ: ${JSON.stringify(data.debug)}]` : ''
        setError(msg + debug)
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* ガラスカード */}
      <div
        className="rounded-2xl p-8"
        style={{
          background: 'rgba(255,255,255,0.10)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.22)',
          boxShadow:
            '0 25px 50px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.30)',
        }}
      >
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white tracking-wide">NAS</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
            NTS Article System
          </p>
        </div>
        <p className="text-sm text-center mb-6" style={{ color: 'rgba(255,255,255,0.70)' }}>
          メールアドレスとパスワードを入力してください
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* メールアドレス */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.85)' }}>
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="example@company.com"
              className="w-full px-4 py-2.5 rounded-xl text-white placeholder-white/40 focus:outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.20)',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.15)',
              }}
              onFocus={e => {
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.55)'
                e.currentTarget.style.boxShadow =
                  '0 0 0 3px rgba(0,180,255,0.30), inset 0 1px 3px rgba(0,0,0,0.15)'
              }}
              onBlur={e => {
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.20)'
                e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.15)'
              }}
            />
          </div>

          {/* パスワード */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.85)' }}>
              パスワード
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full pl-4 pr-11 py-2.5 rounded-xl text-white placeholder-white/40 focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.20)',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.15)',
                }}
                onFocus={e => {
                  e.currentTarget.style.border = '1px solid rgba(255,255,255,0.55)'
                  e.currentTarget.style.boxShadow =
                    '0 0 0 3px rgba(0,180,255,0.30), inset 0 1px 3px rgba(0,0,0,0.15)'
                }}
                onBlur={e => {
                  e.currentTarget.style.border = '1px solid rgba(255,255,255,0.20)'
                  e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.15)'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded transition-opacity hover:opacity-80"
                style={{ color: 'rgba(255,255,255,0.65)' }}
                aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p
              className="text-sm rounded-xl px-3 py-2"
              style={{
                background: 'rgba(239,68,68,0.20)',
                border: '1px solid rgba(239,68,68,0.40)',
                color: '#fca5a5',
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #0055ff 0%, #00b4ff 100%)',
              boxShadow: '0 4px 15px rgba(0,85,255,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
            }}
          >
            {loading ? '確認中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}
