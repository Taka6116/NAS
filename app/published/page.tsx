'use client'

import { useEffect, useState } from 'react'
import { SavedArticle } from '@/lib/types'
import { getAllArticles, saveArticle, deleteArticle } from '@/lib/articleStorage'
import { FileText, ExternalLink, Copy, Trash2 } from 'lucide-react'

export default function PublishedArticlesPage() {
  const [articles, setArticles] = useState<SavedArticle[]>([])
  const [mounted, setMounted] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<SavedArticle | null>(null)

  const loadArticles = async () => {
    const all = await getAllArticles()
    setArticles(all.filter(article => article.status === 'published'))
  }

  useEffect(() => {
    loadArticles().then(() => setMounted(true))
  }, [])

  const handleDuplicateToSaved = async (article: SavedArticle) => {
    const newArticle: SavedArticle = {
      ...article,
      id: `copy-${Date.now()}`,
      wordpressUrl: undefined,
      status: 'draft',
      createdAt: new Date().toISOString(),
      scheduledDate: undefined,
      imageUrl: '',
    }
    try {
      await saveArticle(newArticle)
      setCopiedId(article.id)
      setTimeout(() => setCopiedId(null), 2000)
      await loadArticles()
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存に失敗しました')
    }
  }

  const handleDelete = (article: SavedArticle) => {
    setConfirmTarget(article)
  }

  if (!mounted) return null

  return (
    <div className="w-full pt-6 pb-12 px-2">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: '#1A1A2E' }}>
          過去投稿済み記事一覧
        </h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          投稿済みの記事を閲覧できます。複製時は画像を含みません（編集画面で再生成できます）。
        </p>
      </div>

      {articles.length === 0 && (
        <div
          className="rounded-xl p-16 flex flex-col items-center gap-4 text-center"
          style={{ background: 'white', border: '1px solid #E2E8F0' }}
        >
          <FileText size={40} style={{ color: '#CBD5E1' }} />
          <div>
            <p className="font-semibold" style={{ color: '#64748B' }}>
              投稿済み記事はまだありません
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {articles.map(article => (
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
                  投稿日：{new Date(article.createdAt).toLocaleDateString('ja-JP')}
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
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => handleDuplicateToSaved(article)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: copiedId === article.id ? '#E2E8F0' : '#F0F4FF',
                  border: '1px solid #C7D7FF',
                  color: '#1B2A4A',
                }}
              >
                <Copy size={14} />
                {copiedId === article.id ? '複製しました' : '保存済み記事一覧に複製する'}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(article)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#B91C1C',
                }}
              >
                <Trash2 size={14} />
                削除する
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 削除確認モーダル（画面中央） */}
      {confirmTarget && (
        <div
          className="
            fixed inset-0 z-50 flex items-center justify-center
            bg-black/40
          "
        >
          <div
            className="w-full max-w-md rounded-xl p-6 space-y-4"
            style={{ background: 'white', boxShadow: '0 10px 25px rgba(15,23,42,0.18)' }}
          >
            <h2 className="text-base font-semibold" style={{ color: '#1A1A2E' }}>
              記事を一覧から削除しますか？
            </h2>
            <p className="text-sm" style={{ color: '#64748B', whiteSpace: 'pre-line' }}>
              {`「${(confirmTarget.refinedTitle || confirmTarget.title).slice(0, 30)}…」を一覧から削除しますか？\n（WordPress上の記事は削除されません）`}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: '#E2E8F0', color: '#1F2933' }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteArticle(confirmTarget.id)
                  setConfirmTarget(null)
                  await loadArticles()
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: '#DC2626', color: 'white' }}
              >
                <Trash2 size={14} />
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
