'use client'

import { useRef, useState, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArticleData, ProcessingState, Step } from '@/lib/types'
import StepIndicator from './StepIndicator'
import Button from '@/components/ui/Button'
import { ArrowLeft, ArrowRight, Clock, Download, RefreshCw, Upload, Loader2 } from 'lucide-react'
import { setSessionPreviewImage } from '@/lib/sessionPreviewImage'

interface ImageResultProps {
  article: ArticleData
  fireflyStatus: ProcessingState
  fireflyError?: string | null
  onBack: () => void
  onSaveDraft: () => Promise<string | undefined> | string | void
  onNext: () => void
  onRegenerate: () => void
  onGenerate?: () => void
  onImageUpload?: (imageUrl: string) => void
  onStepClick?: (step: Step) => void
  articleId?: string | null
}

export default function ImageResult({
  article,
  fireflyStatus,
  fireflyError = null,
  onBack,
  onSaveDraft,
  onNext,
  onRegenerate,
  onGenerate,
  onImageUpload,
  onStepClick,
  articleId = null,
}: ImageResultProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [previewNavigating, setPreviewNavigating] = useState(false)

  const handlePreview = async () => {
    if (previewNavigating) return
    setPreviewNavigating(true)
    try {
      const savedId = await onSaveDraft()
      const finalArticleId = savedId || articleId

      const content = article.refinedContent || article.originalContent || ''
      sessionStorage.setItem('preview_content', content)
      await setSessionPreviewImage(article.imageUrl || null)
      const params = new URLSearchParams({
        title: article.refinedTitle?.trim() || article.title || '',
        category: 'お役立ち情報',
        date: new Date().toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        }).replace(/\//g, '.'),
      })
      if (finalArticleId) params.set('articleId', finalArticleId)
      router.push(`/preview?${params.toString()}`)
    } catch {
      setPreviewNavigating(false)
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = article.imageUrl
    const ext = article.imageUrl.startsWith('data:image/png') ? 'png' : 'jpg'
    link.download = `${article.refinedTitle?.trim() || article.title || 'generated-image'}.${ext}`
    link.click()
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!onImageUpload) return
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      onImageUpload(base64)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const isLoading = fireflyStatus === 'loading'
  const hasImage = !!article.imageUrl && !isLoading
  const isIdle = fireflyStatus === 'idle' || fireflyStatus === 'error'

  return (
    <div className="w-full pt-6 pb-12 relative">
      {previewNavigating && <PreviewNavigationOverlay />}

      {/* 2-column: main + step rail */}
      <div className="flex gap-6 items-start">
        {/* ── Main column ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">

          {/* Page header */}
          <div>
            <p className="text-xs font-bold tracking-[0.11em] uppercase mb-0.5" style={{ color: 'var(--primary)' }}>
              Image Generation Studio
            </p>
            <h2 className="text-base font-bold" style={{ color: 'var(--ink)' }}>記事用画像の生成</h2>
          </div>

          {/* Error banner */}
          {fireflyStatus === 'error' && fireflyError && (
            <div
              className="rounded-[12px] px-4 py-3 text-sm"
              style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}
            >
              <p className="font-semibold mb-1" style={{ color: '#991b1b' }}>画像生成できませんでした</p>
              <p className="break-all" style={{ color: '#b91c1c' }}>{fireflyError}</p>
            </div>
          )}

          {/* Main studio panel */}
          <div
            className="rounded-[18px] overflow-hidden"
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {/* Panel header strip */}
            <div
              className="px-6 py-4 flex items-center gap-3"
              style={{ borderBottom: '1px solid var(--border)', background: 'rgba(18,103,242,0.03)' }}
            >
              <div
                className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(18,103,242,0.08)', border: '1px solid rgba(18,103,242,0.16)' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-none" style={{ color: 'var(--ink)' }}>画像生成エリア</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {hasImage ? '画像が生成されました' : isLoading ? '画像を生成中です…' : '記事用の画像を生成します'}
                </p>
              </div>
              {hasImage && (
                <span
                  className="nas-badge"
                  style={{ background: 'rgba(15,159,110,0.09)', color: '#065f46', border: '1px solid rgba(15,159,110,0.25)' }}
                >
                  <span className="nas-badge-dot" style={{ background: 'var(--success)' }} />
                  生成済み
                </span>
              )}
            </div>

            <div className="px-6 py-6 flex flex-col items-center gap-6">
              {/* Empty / idle state */}
              {!article.imageUrl && isIdle && onGenerate && (
                <div
                  className="w-full max-w-[640px] rounded-[14px] flex flex-col items-center justify-center gap-5 py-14 px-8 text-center"
                  style={{
                    background: 'linear-gradient(180deg, rgba(18,103,242,0.03) 0%, rgba(24,169,230,0.04) 100%)',
                    border: '1.5px dashed rgba(18,103,242,0.22)',
                  }}
                >
                  {/* CSS-only placeholder icon */}
                  <div className="relative w-16 h-16">
                    <div
                      className="absolute inset-0 rounded-[14px]"
                      style={{
                        background: 'linear-gradient(145deg, rgba(18,103,242,0.12), rgba(24,169,230,0.10))',
                        border: '1px solid rgba(18,103,242,0.18)',
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-base mb-1" style={{ color: 'var(--ink)' }}>
                      記事用の画像を生成します
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {fireflyStatus === 'error' ? 'エラーが発生しました。もう一度お試しください。' : '生成には30秒〜1分ほどかかります'}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
                      生成後に保存してプレビューへ進めます
                    </p>
                  </div>
                  <Button variant="primary" size="lg" onClick={onGenerate}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.636 5.636l2.122 2.122m8.486 8.486 2.122 2.122M5.636 18.364l2.122-2.122m8.486-8.486 2.122-2.122" />
                    </svg>
                    画像を生成する
                  </Button>
                </div>
              )}

              {/* Loading state */}
              {isLoading && <ImageGenerationLoader />}

              {/* Generated image */}
              {article.imageUrl && !isLoading && (
                <div
                  className="w-full max-w-[640px] rounded-[12px] overflow-hidden"
                  style={{ boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}
                >
                  <Image
                    src={article.imageUrl}
                    alt="生成された記事画像"
                    width={1000}
                    height={525}
                    className="w-full h-auto"
                    unoptimized
                  />
                </div>
              )}

              {/* Secondary actions */}
              <div
                className={`flex items-center gap-2.5 flex-wrap justify-center ${isLoading ? 'opacity-40 pointer-events-none' : ''}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button variant="ghost" size="md" onClick={handleUploadClick} disabled={isLoading}>
                  <Upload size={14} />
                  画像をアップロード
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={handleDownload}
                  disabled={!article.imageUrl || isLoading}
                >
                  <Download size={14} />
                  画像を保存する
                </Button>
                <Button variant="ghost" size="md" onClick={onRegenerate} disabled={isLoading}>
                  <RefreshCw size={14} />
                  別の画像を生成する
                </Button>
              </div>

              {/* Primary CTA row */}
              <div
                className="w-full max-w-[640px] flex items-center justify-between gap-4 pt-4"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <button
                  type="button"
                  onClick={onSaveDraft}
                  className="flex items-center gap-2 min-h-[44px] px-5 rounded-[11px] text-sm font-semibold transition-all duration-150 flex-shrink-0 hover:brightness-105"
                  style={{
                    background: 'rgba(18,103,242,0.07)',
                    border: '1px solid rgba(18,103,242,0.22)',
                    color: 'var(--primary)',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
                  </svg>
                  下書きに保存
                </button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handlePreview}
                  disabled={previewNavigating || fireflyStatus !== 'success' || !article.imageUrl}
                  className="flex-shrink-0"
                >
                  {previewNavigating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      準備中…
                    </>
                  ) : (
                    <>
                      プレビューへ
                      <ArrowRight size={17} />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Step rail ── */}
        <div className="flex-shrink-0 w-[140px] pt-2">
          <StepIndicator currentStep={3} onStepClick={onStepClick} />
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between mt-8">
        <Button variant="ghost" size="md" onClick={onBack}>
          <ArrowLeft size={16} />
          内容を推敲する
        </Button>
      </div>
    </div>
  )
}

/** プレビュー遷移：下書き保存〜ルーティング待ちの全画面オーバーレイ */
function PreviewNavigationOverlay() {
  const ringR = 40
  const c = 2 * Math.PI * ringR
  const dash = Math.round(c * 0.28)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      style={{ background: 'rgba(10,20,50,0.50)' }}
      role="alertdialog"
      aria-busy="true"
      aria-label="下書き保存とプレビュー準備中"
    >
      <div className="absolute inset-0 backdrop-blur-md" style={{ background: 'rgba(255,255,255,0.18)' }} aria-hidden />
      <div
        className="relative w-full max-w-md rounded-[22px] px-8 py-10 text-center"
        style={{
          background: 'var(--surface-raised)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="relative w-[92px] h-[92px] mx-auto mb-6 flex items-center justify-center">
          <svg
            className="absolute inset-0 w-[92px] h-[92px] motion-reduce:animate-none animate-[spin_1.35s_linear_infinite]"
            viewBox="0 0 100 100"
            fill="none"
            aria-hidden
          >
            <circle cx="50" cy="50" r={ringR} stroke="var(--border)" strokeWidth="5" fill="none" />
            <circle
              cx="50"
              cy="50"
              r={ringR}
              stroke="var(--primary)"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${dash} ${Math.round(c)}`}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div
            className="relative w-8 h-8 rounded-full"
            style={{ background: 'linear-gradient(135deg, rgba(18,103,242,0.18) 0%, rgba(24,169,230,0.22) 100%)' }}
            aria-hidden
          />
        </div>
        <h2 className="text-lg font-bold tracking-tight leading-snug" style={{ color: 'var(--ink)' }}>
          下書き保存とプレビューを作成中です
        </h2>
        <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          そのままお待ちください。完了するとプレビュー画面へ移動します。
        </p>
        <p className="mt-6 flex items-center justify-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: 'var(--primary)' }} aria-hidden />
          <span>処理中…</span>
        </p>
      </div>
    </div>
  )
}

/** 画像生成API待ち: ローディングカード */
function ImageGenerationLoader() {
  const ringR = 44
  const c = 2 * Math.PI * ringR
  const dash = Math.round(c * 0.28)

  return (
    <div className="w-full max-w-[640px] flex flex-col gap-4" role="status" aria-live="polite">
      <div
        className="w-full rounded-[16px] px-8 py-10 flex flex-col items-center text-center"
        style={{
          background: 'linear-gradient(180deg, rgba(18,103,242,0.04) 0%, white 100%)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="relative w-[100px] h-[100px] mb-6 flex items-center justify-center">
          <svg
            className="absolute inset-0 w-[100px] h-[100px] motion-reduce:animate-none animate-[spin_1.35s_linear_infinite]"
            viewBox="0 0 100 100"
            fill="none"
            aria-hidden
          >
            <circle cx="50" cy="50" r={ringR} stroke="var(--border)" strokeWidth="5" fill="none" />
            <circle
              cx="50"
              cy="50"
              r={ringR}
              stroke="var(--primary)"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${dash} ${Math.round(c)}`}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div
            className="relative w-9 h-9 rounded-full"
            style={{ background: 'linear-gradient(135deg, rgba(18,103,242,0.15) 0%, rgba(24,169,230,0.18) 100%)' }}
            aria-hidden
          />
        </div>

        <h2 className="text-lg font-bold leading-snug tracking-tight" style={{ color: 'var(--ink)' }}>
          記事に最適なイメージを構築中
        </h2>
        <p className="text-sm mt-2 max-w-md leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          AIが文脈に合わせたビジュアルを生成しています
        </p>
        <p className="mt-5 flex items-center justify-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Clock className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--primary)', opacity: 0.7 }} aria-hidden />
          <span>約30秒〜1分で完了することが多いです</span>
        </p>
      </div>

      <div
        className="rounded-[12px] px-4 py-3 flex gap-3 text-left"
        style={{
          background: 'rgba(18,103,242,0.04)',
          border: '1px solid rgba(18,103,242,0.14)',
        }}
      >
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          <span className="font-semibold" style={{ color: 'var(--primary)' }}>Tips: </span>
          高品質な画像は読了率の向上に効くことがあります。AIは記事本文の内容を踏まえて画像を生成しています。
        </p>
      </div>
    </div>
  )
}
