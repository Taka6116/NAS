'use client'

import { useState } from 'react'
import { ArticleData, ProcessingState } from '@/lib/types'
import StepIndicator from './StepIndicator'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { ArrowLeft, ArrowRight, Copy, Check } from 'lucide-react'

interface GeminiResultProps {
  article: ArticleData
  geminiStatus: ProcessingState
  onRefinedContentChange: (content: string) => void
  onBack: () => void
  onNext: () => void
}

export default function GeminiResult({
  article,
  geminiStatus,
  onRefinedContentChange,
  onBack,
  onNext,
}: GeminiResultProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(article.refinedContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <StepIndicator currentStep={2} />

      {geminiStatus === 'loading' && (
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
            Gemini APIが記事を改善中です...
          </p>
        </div>
      )}

      {(geminiStatus === 'success' || geminiStatus === 'error') && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-[#64748B] uppercase tracking-wider">
                元の記事
              </span>
            </div>
            <textarea
              readOnly
              value={article.originalContent}
              className="
                w-full h-96 px-3 py-2.5 rounded-lg
                bg-[#F5F7FA] border border-[#E2E8F0]
                text-[#1A1A2E] text-sm resize-none
                focus:outline-none
              "
            />
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-[#16A34A] uppercase tracking-wider">
                Gemini改善後
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#1B2A4A] transition-colors"
              >
                {copied ? (
                  <>
                    <Check size={13} className="text-[#16A34A]" />
                    <span className="text-[#16A34A]">コピー済み</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    コピー
                  </>
                )}
              </button>
            </div>
            <textarea
              value={article.refinedContent}
              onChange={e => onRefinedContentChange(e.target.value)}
              className="
                w-full h-96 px-3 py-2.5 rounded-lg
                bg-white border border-[#E2E8F0]
                text-[#1A1A2E] text-sm resize-none
                focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/30 focus:border-[#1B2A4A]
                transition-all
              "
            />
          </Card>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" size="md" onClick={onBack}>
          <ArrowLeft size={16} />
          記事を修正する
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={onNext}
          disabled={geminiStatus !== 'success' || !article.refinedContent.trim()}
        >
          ③ 画像を生成する
          <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  )
}
