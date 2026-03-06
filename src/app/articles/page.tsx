'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SavedArticle } from '@/lib/types'
import { getAllArticles, deleteArticle, saveArticle } from '@/lib/articleStorage'
import { FileText, Trash2, Send, Calendar, ExternalLink, Plus } from 'lucide-react'

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: '下書き', color: '#F59E0B', bg: '#FFFBEB' },
  ready: { label: '投稿準備完了', color: '#16A34A', bg: '#F0FDF4' },
  published: { label: '投稿済み', color: '#64748B', bg: '#F8FAFC' },
}

export default function ArticlesPage() {
  const router = useRouter()
  const [articles, setArticles] = useState<SavedArticle[]>([])
  const [mounted, setMounted] = useState(false)

  const reloadArticles = () => {
    setArticles(getAllArticles().filter(article => article.status !== 'published'))
  }

  useEffect(() => {
    reloadArticles()
    setMounted(true)
  }, [])

  const handleDelete = (id: string) => {
    if (!confirm('この記事を削除しますか？')) return
    deleteArticle(id)
    reloadArticles()
  }

  const handleScheduleChange = (id: string, date: string) => {
    const all = getAllArticles()
    const article = all.find(a => a.id === id)
    if (article) {
      article.scheduledDate = date
      saveArticle(article)
      reloadArticles()
    }
  }

  const handlePublish = (article: SavedArticle) => {
    router.push(`/editor?articleId=${article.id}&step=4`)
  }

  if (!mounted) return null

  return (
    <div className="w-full pt-6 pb-12 px-2">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1A1A2E' }}>
            保存済み記事一覧
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            作成済みの記事（画像・文字数）を管理し、投稿できます
          </p>
        </div>
        <button
          onClick={() => router.push('/editor')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: '#C0392B', boxShadow: '0 2px 8px rgba(192,57,43,0.2)' }}
        >
          <Plus size={15} />
          新しい記事を作成
        </button>
      </div>

      {articles.length === 0 && (
        <div
          className="rounded-xl p-16 flex flex-col items-center gap-4 text-center"
          style={{ background: 'white', border: '1px solid #E2E8F0' }}
        >
          <FileText size={40} style={{ color: '#CBD5E1' }} />
          <div>
            <p className="font-semibold" style={{ color: '#64748B' }}>
              保存済み記事はまだありません
            </p>
            <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>
              記事を作成して下書き保存すると、ここに一覧表示されます
            </p>
          </div>
          <button
            onClick={() => router.push('/editor')}
            className="mt-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ background: 'var(--color-client)' }}
          >
            最初の記事を作成する
          </button>
        </div>
      )}

      <div className="space-y-3">
        {articles.map(article => {
          const st = STATUS_LABEL[article.status]
          return (
            <div
              key={article.id}
              className="rounded-xl p-5 flex items-start gap-5 transition-all"
              style={{
                background: 'white',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              {article.imageUrl ? (
                <img
                  src={article.imageUrl}
                  alt=""
                  className="rounded-lg object-cover flex-shrink-0"
                  style={{ width: 80, height: 56 }}
                />
              ) : (
                <div
                  className="rounded-lg flex-shrink-0 flex items-center justify-center"
                  style={{ width: 80, height: 56, background: '#F1F5F9' }}
                >
                  <FileText size={20} style={{ color: '#CBD5E1' }} />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ color: st.color, background: st.bg, fontFamily: 'DM Mono' }}
                  >
                    {st.label}
                  </span>
                  {article.targetKeyword && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        color: '#1B2A4A',
                        background: '#F0F4FF',
                        border: '1px solid #C7D7FF',
                        fontFamily: 'DM Mono',
                      }}
                    >
                      KW: {article.targetKeyword}
                    </span>
                  )}
                </div>

                <h3
                  className="font-semibold text-sm leading-snug mb-1 truncate"
                  style={{ color: '#1A1A2E' }}
                >
                  {article.refinedTitle || article.title}
                </h3>

                <div className="flex items-center gap-4">
                  <span className="text-xs" style={{ color: '#94A3B8', fontFamily: 'DM Mono' }}>
                    {article.wordCount.toLocaleString()}文字
                  </span>
                  <span className="text-xs" style={{ color: '#94A3B8' }}>
                    作成：{new Date(article.createdAt).toLocaleDateString('ja-JP')}
                  </span>
                  {article.wordpressUrl && (
                    <a
                      href={article.wordpressUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs"
                      style={{ color: '#1B2A4A' }}
                    >
                      <ExternalLink size={11} />
                      記事を確認
                    </a>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <Calendar size={13} style={{ color: '#94A3B8' }} />
                  <input
                    type="date"
                    value={article.scheduledDate ?? ''}
                    onChange={e => handleScheduleChange(article.id, e.target.value)}
                    className="text-xs px-2 py-1 rounded-md border"
                    style={{
                      border: '1px solid #E2E8F0',
                      color: '#64748B',
                      fontFamily: 'DM Mono',
                      background: '#FAFBFC',
                    }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  {article.status !== 'published' && (
                    <button
                      onClick={() => handlePublish(article)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                      style={{ background: '#C0392B' }}
                    >
                      <Send size={11} />
                      投稿する
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(article.id)}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ background: '#FEF2F2', color: '#EF4444' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
