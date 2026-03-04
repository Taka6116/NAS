'use client'

import { ArticleData } from '@/lib/types'
import StepIndicator from './StepIndicator'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { ArrowRight } from 'lucide-react'

interface ArticleInputProps {
  article: ArticleData
  onTitleChange: (title: string) => void
  onContentChange: (content: string) => void
  onNext: () => void
}

export default function ArticleInput({
  article,
  onTitleChange,
  onContentChange,
  onNext,
}: ArticleInputProps) {
  const isDisabled = !article.title.trim() || !article.originalContent.trim()
  const charCount = article.originalContent.length

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <StepIndicator currentStep={1} />

      <Card>
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
                min-h-[400px]
              "
            />
            <div className="flex justify-end mt-1.5">
              <span className="text-xs font-mono text-[#64748B]">
                {charCount.toLocaleString()}文字
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6 pt-5 border-t border-[#E2E8F0]">
          <Button
            variant="primary"
            size="lg"
            disabled={isDisabled}
            onClick={onNext}
          >
            ② Geminiで推敲する
            <ArrowRight size={18} />
          </Button>
        </div>
      </Card>
    </div>
  )
}
