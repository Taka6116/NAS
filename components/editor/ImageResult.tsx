'use client'

import Image from 'next/image'
import { ArticleData, ProcessingState } from '@/lib/types'
import StepIndicator from './StepIndicator'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { ArrowLeft, ArrowRight, Download, RefreshCw } from 'lucide-react'

interface ImageResultProps {
  article: ArticleData
  fireflyStatus: ProcessingState
  onBack: () => void
  onSaveDraft: () => void
  onNext: () => void
  onRegenerate: () => void
}

export default function ImageResult({
  article,
  fireflyStatus,
  onBack,
  onSaveDraft,
  onNext,
  onRegenerate,
}: ImageResultProps) {
  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = article.imageUrl
    link.download = `${article.title || 'generated-image'}.jpg`
    link.click()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <StepIndicator currentStep={3} />

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
            Adobe Firefly APIが画像を生成中です...
          </p>
        </div>
      )}

      {(fireflyStatus === 'success' || fireflyStatus === 'error') && (
        <Card>
          <div className="flex flex-col items-center gap-5">
            {article.imageUrl && (
              <div className="w-full max-w-[600px] rounded-lg overflow-hidden border border-[#E2E8F0]">
                <Image
                  src={article.imageUrl}
                  alt="生成された記事画像"
                  width={800}
                  height={450}
                  className="w-full h-auto"
                  unoptimized
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="md" onClick={handleDownload}>
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
          </div>
        </Card>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" size="md" onClick={onBack}>
          <ArrowLeft size={16} />
          推敲に戻る
        </Button>
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
            onClick={onNext}
            disabled={fireflyStatus !== 'success' || !article.imageUrl}
          >
            ④ 記事を投稿する
            <ArrowRight size={18} />
          </Button>
        </div>
      </div>
    </div>
  )
}
