'use client'

import { ArticleData } from '@/lib/types'
import StepIndicator from './StepIndicator'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { ArrowRight } from 'lucide-react'

interface ArticleInputProps {
  article: ArticleData
  onTitleChange: (title: string) => void
  onTargetKeywordChange: (kw: string) => void
  onContentChange: (content: string) => void
  onNext: () => void
}

export default function ArticleInput({
  article,
  onTitleChange,
  onTargetKeywordChange,
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

          {/* ターゲットキーワード */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold" style={{ color: '#1A1A2E' }}>
                ターゲットキーワード
              </label>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: '#F0F4FF',
                  color: '#1B2A4A',
                  border: '1px solid #C7D7FF',
                  fontFamily: 'DM Mono',
                }}
              >
                SEO・Gemini推敲に使用
              </span>
            </div>
            <input
              type="text"
              value={article.targetKeyword ?? ''}
              onChange={e => onTargetKeywordChange(e.target.value)}
              placeholder="例：事業承継 相談"
              className="w-full px-4 py-3 rounded-lg text-sm border transition-all"
              style={{ border: '1.5px solid #E2E8F0', color: '#1A1A2E', background: '#FAFBFC' }}
            />
            <p className="text-xs mt-1.5" style={{ color: '#94A3B8' }}>
              Ahrefsで選定したキーワードを入力してください。Geminiが推敲時にSEO最適化します。
            </p>
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
