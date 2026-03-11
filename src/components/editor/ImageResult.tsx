'use client'

import { useRef, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArticleData, ProcessingState, Step } from '@/lib/types'
import StepIndicator from './StepIndicator'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { ArrowLeft, ArrowRight, Download, RefreshCw, Upload } from 'lucide-react'

interface ImageResultProps {
  article: ArticleData
  fireflyStatus: ProcessingState
  /** 画像生成失敗時に表示するAPIエラーメッセージ */
  fireflyError?: string | null
  onBack: () => void
  onSaveDraft: () => string | void
  onNext: () => void
  onRegenerate: () => void
  /** クライアント画像を選択したときに呼ばれる（imageUrl を上書き） */
  onImageUpload?: (imageUrl: string) => void
  onStepClick?: (step: Step) => void
  /** プレビュー遷移時に「このまま投稿する」でSTEP4へ戻るために使用 */
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
  onImageUpload,
  onStepClick,
  articleId = null,
}: ImageResultProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handlePreview = () => {
    // プレビュー前に最新の画像を保存させる
    const savedId = onSaveDraft()
    const finalArticleId = savedId || articleId
    
    const content = article.refinedContent || article.originalContent || ''
    sessionStorage.setItem('preview_content', content)
    if (article.imageUrl) {
      sessionStorage.setItem('preview_image', article.imageUrl)
    } else {
      sessionStorage.removeItem('preview_image')
    }
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

  return (
    <div className="w-full pt-6 pb-12">
      {/* 2カラム：左＝メインコンテンツ、右＝StepIndicator */}
      <div className="flex gap-8 items-start">
        {/* 左：メインコンテンツ（可変幅） */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          {/* エラー表示 */}
          {fireflyStatus === 'error' && fireflyError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-medium">画像生成できませんでした</p>
              <p className="mt-1 break-all">{fireflyError}</p>
            </div>
          )}
          {/* ローディング */}
          {fireflyStatus === 'loading' && (
            <div className="rounded-lg bg-[#1B2A4A]/5 border border-[#1B2A4A]/10 px-5 py-4 flex items-center gap-3">
              <svg
                className="animate-spin h-5 w-5 text-[#1B2A4A] flex-shrink-0"
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
              <p className="text-sm text-[#1B2A4A] font-medium">
                画像生成中です（30秒～1分ほどかかります）
              </p>
            </div>
          )}

          {/* 画像カード（画像の箱）：下書きに保存・プレビューへはカード内左右に配置 */}
          <Card>
            <div className="flex flex-col items-center gap-5">
              {article.imageUrl && (
                <div className="w-full max-w-[640px] rounded-lg overflow-hidden border border-[#E2E8F0]">
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

              <div className="flex items-center gap-3 flex-wrap justify-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button variant="ghost" size="md" onClick={handleUploadClick}>
                  <Upload size={15} />
                  画像をアップロード
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={handleDownload}
                  disabled={!article.imageUrl}
                >
                  <Download size={15} />
                  画像を保存する
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={onRegenerate}
                  disabled={fireflyStatus as string === 'loading'}
                >
                  <RefreshCw size={15} />
                  別の画像を生成する
                </Button>
              </div>

              {/* 画像の箱内：下書きに保存（左）・プレビューへ（右） */}
              <div className="w-full max-w-[640px] flex items-center justify-between gap-4 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={onSaveDraft}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium flex-shrink-0"
                  style={{ background: '#F0F4FF', border: '1.5px solid #C7D7FF', color: '#1B2A4A' }}
                >
                  💾 下書きに保存
                </button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handlePreview}
                  disabled={fireflyStatus !== 'success' || !article.imageUrl}
                  className="flex-shrink-0"
                >
                  プレビューへ
                  <ArrowRight size={18} />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* 右：StepIndicator（固定幅） */}
        <div className="flex-shrink-0 w-[140px] pt-2">
          <StepIndicator currentStep={3} onStepClick={onStepClick} />
        </div>
      </div>

      {/* 下：戻るのみ（ナビはカード内に移動済み） */}
      <div className="flex items-center justify-between mt-8">
        <Button variant="ghost" size="md" onClick={onBack}>
          <ArrowLeft size={16} />
          Gemini推敲に戻る
        </Button>
      </div>
    </div>
  )
}
