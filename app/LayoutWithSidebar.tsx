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
      <div className="flex-1 flex items-center justify-center min-h-screen bg-[#F5F7FA] px-4">
        {children}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className="
          fixed top-0 left-0 h-screen w-[220px] flex-shrink-0 z-40
          text-white border-r flex flex-col
        "
        style={{ backgroundColor: '#002C93', borderColor: '#0039b3' }}
      >
        <div className="px-5 py-4 border-b" style={{ borderColor: '#0039b3' }}>
          <div className="text-[23px] font-bold tracking-wide">NAS</div>
          <div className="text-[14px] text-[#94A3B8] font-mono mt-0.5">
            NTS Article System
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 text-sm space-y-6">
          <div>
            <div className="space-y-1">
              <Link
                href="/editor"
                className="flex items-center px-3 py-2.5 rounded-lg text-[16px] font-semibold text-[#E2E8F0] hover:text-white hover:bg-[#0039b3] transition-all"
              >
                記事を作成
              </Link>
              <Link
                href="/articles"
                className="flex items-center px-3 py-2.5 rounded-lg text-[16px] font-semibold text-[#E2E8F0] hover:text-white hover:bg-[#0039b3] transition-all"
              >
                保存済み記事一覧
              </Link>
              <Link
                href="/published"
                className="flex items-center px-3 py-2.5 rounded-lg text-[16px] font-semibold text-[#E2E8F0] hover:text-white hover:bg-[#0039b3] transition-all"
              >
                過去投稿済み記事一覧
              </Link>
              <Link
                href="/schedule"
                className="flex items-center px-3 py-2.5 rounded-lg text-[16px] font-semibold text-[#E2E8F0] hover:text-white hover:bg-[#0039b3] transition-all"
              >
                投稿スケジュール
              </Link>
              <Link
                href="/prompts"
                className="flex items-center px-3 py-2.5 rounded-lg text-[16px] font-semibold text-[#E2E8F0] hover:text-white hover:bg-[#0039b3] transition-all"
              >
                プロンプト
              </Link>
            </div>
          </div>

          <div>
            <div className="space-y-1">
              <div className="px-3 py-2 text-[16px] font-semibold text-[#E2E8F0]">
                設定
              </div>
            </div>
          </div>
        </nav>

        <div className="px-5 py-3 text-[10px] text-[#94A3B8] border-t" style={{ borderColor: '#0039b3' }}>
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
