'use client'

import { ArticleData, ProcessingState } from '@/lib/types'
import StepIndicator from './StepIndicator'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { CheckCircle, ExternalLink, FileText, Image as ImageIcon, Type } from 'lucide-react'

interface PublishResultProps {
  article: ArticleData
  wordpressStatus: ProcessingState
  onPublish: () => void
  onReset: () => void
}

export default function PublishResult({
  article,
  wordpressStatus,
  onPublish,
  onReset,
}: PublishResultProps) {
  const charCount = article.refinedContent.length

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <StepIndicator currentStep={4} />

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
        <>
          <Card>
            <h2 className="text-base font-bold text-[#1A1A2E] mb-4">
              投稿内容の確認
            </h2>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[#F5F7FA]">
                <Type size={16} className="text-[#64748B] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-mono text-[#64748B] mb-0.5">タイトル</p>
                  <p className="text-sm font-semibold text-[#1A1A2E]">{article.title}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-[#F5F7FA]">
                <FileText size={16} className="text-[#64748B] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-mono text-[#64748B] mb-0.5">文字数</p>
                  <p className="text-sm font-semibold text-[#1A1A2E]">
                    {charCount.toLocaleString()}文字
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-[#F5F7FA]">
                <ImageIcon size={16} className="text-[#64748B] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-mono text-[#64748B] mb-0.5">画像</p>
                  <p className="text-sm font-semibold text-[#16A34A] flex items-center gap-1">
                    <CheckCircle size={13} />
                    生成済み
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[#E2E8F0]">
              {wordpressStatus === 'loading' ? (
                <div className="flex items-center justify-center gap-3 py-3">
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
                <Button
                  variant="primary"
                  size="lg"
                  onClick={onPublish}
                  className="w-full justify-center"
                >
                  <CheckCircle size={18} />
                  WordPressに投稿する
                </Button>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
