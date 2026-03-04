import type { Metadata } from 'next'
import Link from 'next/link'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'NAS — NTS Article System',
  description: 'NTS社内記事制作ツール',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;700&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#F5F7FA]">
        <div className="min-h-screen flex">
          {/* 左サイドバー */}
          <aside className="w-64 bg-[#0F172A] text-white border-r border-[#1E293B] flex flex-col">
            <div className="px-5 py-4 border-b border-[#1E293B]">
              <div className="text-lg font-bold tracking-wide">NAS</div>
              <div className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
                NTS Article System
              </div>
            </div>

            <nav className="flex-1 px-3 py-4 text-sm space-y-6">
              <div>
                <p className="px-3 text-[11px] uppercase tracking-wide text-[#64748B] mb-2">
                  メイン
                </p>
                <div className="space-y-1">
                  <div className="px-3 py-2 rounded-lg text-[#64748B] cursor-not-allowed select-none">
                    ダッシュボード
                  </div>
                  <Link
                    href="/editor"
                    className="flex items-center px-3 py-2 rounded-lg bg-[#1E293B] text-[13px] font-semibold text-white shadow-sm"
                  >
                    記事を作成
                  </Link>
                  <div className="px-3 py-2 rounded-lg text-[#64748B] cursor-not-allowed select-none">
                    過去記事一覧
                  </div>
                  <div className="px-3 py-2 rounded-lg text-[#64748B] cursor-not-allowed select-none">
                    投稿スケジュール
                  </div>
                </div>
              </div>

              <div>
                <p className="px-3 text-[11px] uppercase tracking-wide text-[#64748B] mb-2">
                  設定
                </p>
                <div className="space-y-1">
                  <div className="px-3 py-2 rounded-lg text-[#64748B] cursor-not-allowed select-none">
                    設定
                  </div>
                </div>
              </div>
            </nav>

            <div className="px-5 py-3 text-[10px] text-[#64748B] border-t border-[#1E293B]">
              <p>© NTS</p>
            </div>
          </aside>

          {/* 右メインエリア */}
          <div className="flex-1">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}
