'use client'

import { ArticleData, Step } from '@/lib/types'
import StepIndicator from './StepIndicator'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { ArrowRight, Sparkles, Trash2 } from 'lucide-react'

interface ArticleInputProps {
  article: ArticleData
  onTitleChange: (title: string) => void
  onContentChange: (content: string) => void
  onNext: () => void
  onClear?: () => void
  onStepClick?: (step: Step) => void
}

export default function ArticleInput({
  article,
  onTitleChange,
  onContentChange,
  onNext,
  onClear,
  onStepClick,
}: ArticleInputProps) {
  const isDisabled = !article.title.trim() || !article.originalContent.trim()
  const charCount = article.originalContent.length

  const charBadge = () => {
    if (charCount === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F1F5F9] text-[#94A3B8]">
          0文字
        </span>
      )
    }
    if (charCount < 100) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600 border border-orange-200">
          {charCount.toLocaleString()}文字 · もう少し入力してください
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
        {charCount.toLocaleString()}文字
      </span>
    )
  }

  return (
    <div className="w-full pt-6 pb-12">
      {/* 2カラム：左＝メインコンテンツ、右＝StepIndicator */}
      <div className="flex gap-8 items-start">
        {/* 左：メインコンテンツ（可変幅） */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          <Card>
            <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-[#64748B]">
            NotebookLMで生成した記事のタイトルと本文を貼り付けてください
          </p>
          {(article.title || article.originalContent) && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#DC2626] hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
            >
              <Trash2 size={13} />
              入力をクリア
            </button>
          )}
            </div>

            <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">
              記事タイトル
            </label>
            <input
              type="text"
              value={article.title}
              onChange={e => onTitleChange(e.target.value)}
              placeholder="記事のタイトルを入力してください"
              className="
                w-full px-4 py-2.5 rounded-lg border border-[#E2E8F0]
                text-[#1A1A2E] placeholder-[#CBD5E1]
                focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/30 focus:border-[#1B2A4A]
                transition-all text-sm
              "
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">
              記事本文
            </label>
            <textarea
              value={article.originalContent}
              onChange={e => onContentChange(e.target.value)}
              placeholder="NotebookLMで生成した記事テキストをここに貼り付けてください"
              className="
                w-full px-4 py-3 rounded-lg border border-[#E2E8F0]
                text-[#1A1A2E] placeholder-[#CBD5E1]
                focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/30 focus:border-[#1B2A4A]
                transition-all text-sm resize-y
                min-h-[380px]
              "
            />
            <div className="flex justify-end mt-1.5">
              {charBadge()}
            </div>
          </div>
            </div>

            <div className="flex justify-end mt-6 pt-5 border-t border-[#E2E8F0]">
          <Button
            variant="primary"
            disabled={isDisabled}
            onClick={onNext}
            className="py-4 px-8 h-auto"
          >
            <Sparkles size={18} />
            <span className="flex flex-col items-start leading-tight">
              <span className="font-bold text-base">② Geminiで推敲する</span>
              <span className="text-xs font-normal opacity-80">AIが記事の品質・読みやすさ・SEOを自動改善します</span>
            </span>
          </Button>
            </div>
          </Card>
        </div>

        {/* 右：StepIndicator（固定幅） */}
        <div className="flex-shrink-0 w-[140px] pt-2">
          <StepIndicator currentStep={1} onStepClick={onStepClick} />
        </div>
      </div>
    </div>
  )
}
