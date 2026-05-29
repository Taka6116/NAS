'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import MainContentWidth from './MainContentWidth'

export default function LayoutWithSidebar({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isLogin = pathname === '/login'

  if (isLogin) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen px-4"
        style={{
          background: 'linear-gradient(135deg, #001250 0%, #002C93 45%, #0066ff 80%, #00b4ff 100%)',
        }}
      >
        {children}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className="fixed top-0 left-0 h-screen w-[220px] flex-shrink-0 z-40 flex flex-col text-white"
        style={{
          background: 'linear-gradient(180deg, #001250 0%, #002C93 55%, #0047C8 100%)',
          borderRight: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        {/* ガラス感の内側レイヤー */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.01) 60%, rgba(0,180,255,0.08) 100%)',
          }}
          aria-hidden
        />

        <div
          className="relative px-5 py-4 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.12)' }}
        >
          <div className="text-[23px] font-bold tracking-wide">NAS</div>
          <div className="text-[13px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
            NTS Article System
          </div>
        </div>

        <nav className="relative flex-1 px-3 py-4 text-sm space-y-1 overflow-y-auto">
          {[
            { href: '/editor', label: '記事を作成' },
            { href: '/articles', label: '保存済み記事一覧' },
            { href: '/published', label: '過去投稿済み記事一覧' },
            { href: '/schedule', label: '投稿スケジュール' },
            { href: '/prompts', label: 'プロンプト' },
            { href: '/keywords', label: 'キーワード' },
            { href: '/ahrefs', label: 'KW分析' },
            { href: '/notice', label: '注意書き' },
          ].map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center px-3 py-2.5 rounded-xl text-[15px] font-semibold transition-all duration-150"
                style={
                  isActive
                    ? {
                        background: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        color: '#ffffff',
                        boxShadow:
                          'inset 0 0 0 1px rgba(255,255,255,0.22), inset 3px 0 0 #60A5FA, 0 4px 16px rgba(0,0,0,0.15)',
                      }
                    : {
                        color: 'rgba(255,255,255,0.70)',
                      }
                }
                onMouseEnter={e => {
                  if (!isActive)
                    (e.currentTarget as HTMLElement).style.cssText += `
                      background: rgba(255,255,255,0.08);
                      color: rgba(255,255,255,0.95);
                    `
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    ;(e.currentTarget as HTMLElement).style.background = ''
                    ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.70)'
                  }
                }}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        <div
          className="relative px-5 py-3 text-[10px] border-t"
          style={{ borderColor: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.40)' }}
        >
          <p>© NTS</p>
        </div>
      </aside>

      <div className="ml-[220px] flex-1 flex flex-col min-h-screen bg-[#F5F7FA]">
        <main className="flex-1 flex items-center justify-center px-6 py-8">
          <MainContentWidth>{children}</MainContentWidth>
        </main>
      </div>
    </div>
  )
}
