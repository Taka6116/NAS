'use client'

import { useEffect, useState, useMemo } from 'react'
import { ArticleData, ProcessingState, Step } from '@/lib/types'
import StepIndicator from './StepIndicator'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { ArrowLeft, CheckCircle, ExternalLink, FileText, Image as ImageIcon, Type, Link as LinkIcon } from 'lucide-react'

interface PublishResultProps {
  article: ArticleData
  wordpressStatus: ProcessingState
  wordpressError?: string | null
  onBack: () => void
  onSaveDraft: () => Promise<string | undefined> | void
  onPublish: () => void
  onReset: () => void
  onStepClick?: (step: Step) => void
  onRefinedTitleChange?: (title: string) => void
  onRefinedContentChange?: (content: string) => void
  slug?: string
  onSlugChange?: (slug: string) => void
}

export default function PublishResult({
  article,
  wordpressStatus,
  wordpressError = null,
  onBack,
  onSaveDraft,
  onPublish,
  onReset,
  onStepClick,
  onRefinedTitleChange,
  onRefinedContentChange,
  slug = '',
  onSlugChange,
}: PublishResultProps) {
  // Ctrl+A で全選択→削除が効くよう、タイトルをローカル state で保持して即反映する
  const [localTitle, setLocalTitle] = useState(() => article.refinedTitle ?? article.title)
  // 別記事を開いたときだけ親から同期（article.title が変わる＝記事の差し替え）
  useEffect(() => {
    setLocalTitle(article.refinedTitle ?? article.title)
  }, [article.title])

  const handleTitleChange = (value: string) => {
    setLocalTitle(value)
    onRefinedTitleChange?.(value)
  }

  const autoSlug = useMemo(() => generateSlugFromTitle(localTitle.trim() || article.title), [localTitle, article.title])
  const [slugMode, setSlugMode] = useState<'auto' | 'custom'>(() => slug && slug !== autoSlug ? 'custom' : 'auto')

  useEffect(() => {
    if (slugMode === 'auto' && autoSlug) {
      onSlugChange?.(autoSlug)
    }
  }, [slugMode, autoSlug])

  const finalTitle = localTitle.trim() || article.title
  const finalContent = article.refinedContent || ''
  const charCount = finalContent.length
  const previewExcerpt =
    finalContent.replace(/\s+/g, ' ').trim().slice(0, 120) + (finalContent.length > 120 ? '…' : '')

  return (
    <div className="w-full pt-6 pb-12">
      <div className="flex gap-8 items-start">
        {/* 左：メインコンテンツ */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          {wordpressStatus === 'success' ? (
            <Card>
              <div className="flex flex-col items-center gap-5 py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#16A34A]/10 flex items-center justify-center">
              <CheckCircle size={32} className="text-[#16A34A]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1A1A2E] mb-1">
                記事を投稿しました
              </h2>
              <p className="text-sm text-[#64748B]">
                WordPressに正常に投稿されました
              </p>
            </div>

            {article.wordpressUrl && (
              <a
                href={article.wordpressUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  flex items-center gap-2 text-sm text-[#1B2A4A] font-medium
                  hover:underline underline-offset-2
                "
              >
                投稿された記事を確認する
                <ExternalLink size={14} />
              </a>
            )}

            <Button variant="navy" size="lg" onClick={onReset}>
              新しい記事を作成する
            </Button>
          </div>
            </Card>
          ) : (
            <Card>
              <h2 className="text-base font-bold text-[#1A1A2E] mb-4">
                最終確認ページ
              </h2>

              <div className="space-y-4">
                <div className="rounded-xl overflow-hidden border border-[#E2E8F0] bg-white">
                  {article.imageUrl ? (
                    <img
                      src={article.imageUrl}
                      alt="投稿イメージ"
                      className="w-full h-[220px] object-cover"
                    />
                  ) : (
                    <div className="w-full h-[220px] bg-[#F1F5F9] flex items-center justify-center text-[#94A3B8] text-sm">
                      画像未設定
                    </div>
                  )}
                  <div className="px-4 py-3">
                    <p className="text-xs font-mono text-[#16A34A] mb-1">投稿プレビュー</p>
                    <h3 className="text-lg font-bold text-[#1A1A2E] leading-snug">{finalTitle}</h3>
                    <p className="text-sm text-[#64748B] mt-2">{previewExcerpt}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Type size={16} className="text-[#64748B] mt-0.5 flex-shrink-0" />
                    <div className="w-full">
                      <p className="text-xs font-mono text-[#64748B] mb-0.5">タイトル（最終確認・編集可）</p>
                      <input
                        type="text"
                        value={localTitle}
                        onChange={e => handleTitleChange(e.target.value)}
                        className="
                          w-full px-4 py-2.5 rounded-lg border border-[#E2E8F0]
                          text-sm font-semibold text-[#1A1A2E]
                          focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/30 focus:border-[#1B2A4A]
                          transition-all
                        "
                        placeholder="記事タイトル"
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <LinkIcon size={16} className="text-[#64748B] mt-0.5 flex-shrink-0" />
                    <div className="w-full">
                      <p className="text-xs font-mono text-[#64748B] mb-0.5">スラッグ（URL末尾）</p>
                      <select
                        value={slugMode}
                        onChange={e => {
                          const mode = e.target.value as 'auto' | 'custom'
                          setSlugMode(mode)
                          if (mode === 'auto') onSlugChange?.(autoSlug)
                        }}
                        className="
                          w-full px-4 py-2.5 rounded-lg border border-[#E2E8F0]
                          text-sm text-[#1A1A2E] bg-white
                          focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/30 focus:border-[#1B2A4A]
                          transition-all font-mono mb-1.5
                        "
                      >
                        <option value="auto">{autoSlug}</option>
                        <option value="custom">自分で入力</option>
                      </select>
                      {slugMode === 'custom' && (
                        <input
                          type="text"
                          value={slug}
                          onChange={e => onSlugChange?.(e.target.value)}
                          className="
                            w-full px-4 py-2.5 rounded-lg border border-[#E2E8F0]
                            text-sm text-[#1A1A2E]
                            focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/30 focus:border-[#1B2A4A]
                            transition-all font-mono
                          "
                          placeholder="例: ma-advisor-selection（半角英数字とハイフン）"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <FileText size={16} className="text-[#64748B] mt-0.5 flex-shrink-0" />
                    <div className="w-full">
                      <p className="text-xs font-mono text-[#64748B] mb-0.5">本文（最終確認・編集可）</p>
                      <textarea
                        value={finalContent}
                        onChange={e => onRefinedContentChange?.(e.target.value)}
                        className="
                          w-full rounded-lg border border-[#E2E8F0] bg-white p-3
                          text-sm text-[#1A1A2E] leading-relaxed resize-y
                          min-h-[200px] max-h-[400px]
                          focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/30 focus:border-[#1B2A4A]
                          transition-all
                        "
                        placeholder="記事本文"
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <ImageIcon size={16} className="text-[#64748B] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-mono text-[#64748B] mb-0.5">画像</p>
                      <p className="text-sm font-semibold text-[#16A34A] flex items-center gap-1">
                        <CheckCircle size={13} />
                        {article.imageUrl ? '設定済み' : '未設定'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <FileText size={16} className="text-[#64748B] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-mono text-[#64748B] mb-0.5">文字数</p>
                      <p className="text-sm font-semibold text-[#1A1A2E]">{charCount.toLocaleString()}文字</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* 右：StepIndicator */}
        <div className="flex-shrink-0 w-[140px] pt-2">
          <StepIndicator currentStep={5} onStepClick={onStepClick} />
        </div>
      </div>

      {/* 下：ナビゲーションボタン */}
      {wordpressStatus === 'success' ? (
        <div className="flex items-center justify-end mt-8">
          <Button variant="navy" size="lg" onClick={onReset}>
            新しい記事を作成する
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between mt-8">
          <Button variant="ghost" size="md" onClick={onBack}>
            <ArrowLeft size={16} />
            画像生成に戻る
          </Button>
          {wordpressStatus === 'loading' ? (
            <div className="flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-white border border-[#E2E8F0]">
              <svg
                className="animate-spin h-5 w-5 text-[#1B2A4A]"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span className="text-sm text-[#1B2A4A] font-medium">
                WordPress APIに送信中...
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {wordpressStatus === 'error' && wordpressError && (
                <div
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                >
                  <p className="font-medium mb-1">投稿に失敗しました</p>
                  <p className="font-mono text-xs break-all">{wordpressError}</p>
                  <p className="mt-2 text-xs text-red-600">
                    Vercelの環境変数（WORDPRESS_URL / USERNAME / APP_PASSWORD）や、WordPressのアプリパスワード（0とO・スペース）を確認してください。
                  </p>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={onSaveDraft}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium"
                  style={{ background: '#F0F4FF', border: '1.5px solid #C7D7FF', color: '#1B2A4A' }}
                >
                  💾 下書きに保存
                </button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={onPublish}
                  className="justify-center"
                >
                  <CheckCircle size={18} />
                  WordPressに投稿する
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function generateSlugFromTitle(_title: string): string {
  return 'ma-advisor-selection'
}
