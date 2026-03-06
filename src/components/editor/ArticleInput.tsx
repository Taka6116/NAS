'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArticleData, Step } from '@/lib/types'
import StepIndicator from './StepIndicator'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { ArrowRight, Trash2, Sparkles, FileText } from 'lucide-react'

interface DataFileItem {
  id: string
  originalName: string
  mimeType: string
  size: number
  uploadedAt: string
}

const REFERENCABLE_MIMES = ['text/plain', 'text/csv', 'text/html', 'text/markdown', 'application/json']
function isReferencable(mime: string): boolean {
  return REFERENCABLE_MIMES.includes(mime) || mime.startsWith('text/')
}

interface ArticleInputProps {
  article: ArticleData
  onTitleChange: (title: string) => void
  onTargetKeywordChange: (kw: string) => void
  onContentChange: (content: string) => void
  onNext: () => void
  onClear?: () => void
  onStepClick?: (step: Step) => void
}

export default function ArticleInput({
  article,
  onTitleChange,
  onTargetKeywordChange,
  onContentChange,
  onNext,
  onClear,
  onStepClick,
}: ArticleInputProps) {
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [dataFiles, setDataFiles] = useState<DataFileItem[]>([])
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())

  const fetchDataFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/data/files')
      const data = await res.json()
      const list = Array.isArray(data.files) ? data.files : []
      setDataFiles(list.filter((f: DataFileItem) => isReferencable(f.mimeType)))
    } catch {
      setDataFiles([])
    }
  }, [])

  useEffect(() => {
    fetchDataFiles()
  }, [fetchDataFiles])

  const toggleDataFile = (id: string) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const hasDraft = Boolean(article.title.trim() || article.originalContent.trim())
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

  const handleGenerate = async () => {
    const trimmed = prompt.trim()
    if (!trimmed || generating) return
    setDraftError(null)
    setGenerating(true)
    try {
      const res = await fetch('/api/gemini/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmed,
          targetKeyword: article.targetKeyword ?? '',
          fileIds: Array.from(selectedFileIds),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '一次執筆の生成に失敗しました')
      const title = typeof data.title === 'string' ? data.title.trim() : ''
      const content = typeof data.content === 'string' ? data.content : ''
      if (title) onTitleChange(title)
      if (content) onContentChange(content)
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : '一次執筆の生成に失敗しました')
    } finally {
      setGenerating(false)
    }
  }

  const handleClear = () => {
    setPrompt('')
    setDraftError(null)
    onTitleChange('')
    onContentChange('')
    onClear?.()
  }

  return (
    <div className="w-full pt-6 pb-12">
      <div className="flex gap-8 items-start">
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          <Card>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-[#1A1A2E] mb-0.5">一次執筆</h2>
                <p className="text-sm text-[#64748B]">
                  データページでアップロードした資料 × プロンプトで指示を出し、Geminiが記事のタイトル・本文を生成します。
                </p>
              </div>
              {hasDraft && onClear && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#DC2626] hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                >
                  <Trash2 size={13} />
                  入力をクリア
                </button>
              )}
            </div>

            {/* 参照するデータ ＋ プロンプト */}
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">
                  参照するデータ（データページでアップロードした資料）
                </label>
                <p className="text-xs text-[#64748B] mb-2">
                  選択した資料の内容を参照して記事を作成します。テキスト形式（.txt など）のファイルのみ選択できます。
                </p>
                {dataFiles.length === 0 ? (
                  <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#64748B]">
                    データがありません。「データ」ページで資料をアップロードしてください。
                  </div>
                ) : (
                  <div className="rounded-lg border border-[#E2E8F0] bg-white max-h-[160px] overflow-y-auto">
                    <ul className="divide-y divide-[#E2E8F0]">
                      {dataFiles.map(f => (
                        <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                          <input
                            type="checkbox"
                            id={`data-${f.id}`}
                            checked={selectedFileIds.has(f.id)}
                            onChange={() => toggleDataFile(f.id)}
                            className="rounded border-[#E2E8F0] text-[#1B2A4A] focus:ring-[#1B2A4A]/30"
                          />
                          <label
                            htmlFor={`data-${f.id}`}
                            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer text-sm text-[#1A1A2E]"
                          >
                            <FileText size={16} className="text-[#64748B] flex-shrink-0" />
                            <span className="truncate">{f.originalName}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">
                  プロンプト（指示）
                </label>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="例：事業承継の基礎について、相談先の種類・手順・注意点を分かりやすく2000字程度で記事を書いてください"
                  className="
                    w-full px-4 py-3 rounded-lg border border-[#E2E8F0]
                    text-[#1A1A2E] placeholder-[#CBD5E1]
                    focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/30 focus:border-[#1B2A4A]
                    transition-all text-sm resize-y
                    min-h-[140px]
                  "
                  disabled={generating}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-[#1A1A2E]">
                    ターゲットキーワード（任意）
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
                    SEO・推敲に使用
                  </span>
                </div>
                <input
                  type="text"
                  value={article.targetKeyword ?? ''}
                  onChange={e => onTargetKeywordChange(e.target.value)}
                  placeholder="例：事業承継 相談"
                  className="w-full px-4 py-3 rounded-lg text-sm border border-[#E2E8F0] text-[#1A1A2E] bg-[#FAFBFC] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/30"
                />
              </div>

              <Button
                variant="primary"
                disabled={!prompt.trim() || generating}
                onClick={handleGenerate}
                className="py-3 px-6 h-auto"
              >
                {generating ? (
                  <span className="font-bold text-base">生成中...</span>
                ) : (
                  <>
                    <Sparkles size={18} className="mr-2" />
                    <span className="font-bold text-base">文章を生成する</span>
                  </>
                )}
              </Button>

              {draftError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                  {draftError}
                </div>
              )}
            </div>

            {/* 生成後のタイトル・本文（編集可） */}
            {hasDraft && (
              <>
                <hr className="my-6 border-[#E2E8F0]" />
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">
                      記事タイトル
                    </label>
                    <input
                      type="text"
                      value={article.title}
                      onChange={e => onTitleChange(e.target.value)}
                      placeholder="記事のタイトル"
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
                      placeholder="記事本文"
                      className="
                        w-full px-4 py-3 rounded-lg border border-[#E2E8F0]
                        text-[#1A1A2E] placeholder-[#CBD5E1]
                        focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/30 focus:border-[#1B2A4A]
                        transition-all text-sm resize-y
                        min-h-[320px]
                      "
                    />
                    <div className="flex justify-end mt-1.5">{charBadge()}</div>
                  </div>
                </div>
                <div className="flex justify-end mt-6 pt-5 border-t border-[#E2E8F0]">
                  <Button
                    variant="primary"
                    disabled={isDisabled}
                    onClick={onNext}
                    className="py-4 px-8 h-auto"
                  >
                    <span className="font-bold text-base">Geminiで推敲する</span>
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
        <div className="flex-shrink-0 w-[140px] pt-2">
          <StepIndicator currentStep={1} onStepClick={onStepClick} />
        </div>
      </div>
    </div>
  )
}
