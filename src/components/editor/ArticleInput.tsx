'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ArticleData, Step } from '@/lib/types'
import { SavedPrompt, getAllPrompts } from '@/lib/promptStorage'
import StepIndicator from './StepIndicator'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { ArrowRight, Trash2, Sparkles, ChevronDown, FileText, Cloud, X } from 'lucide-react'

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
  const [generatingStep, setGeneratingStep] = useState<string>('loading')
  const [draftError, setDraftError] = useState<string | null>(null)
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([])
  const [showPromptDropdown, setShowPromptDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const [selectedS3Keys, setSelectedS3Keys] = useState<string[]>([])
  const [localFiles, setLocalFiles] = useState<{ id: string; originalName: string }[]>([])
  const [s3Files, setS3Files] = useState<{ key: string; size: number }[]>([])
  const [showLocalPicker, setShowLocalPicker] = useState(false)
  const [showS3Picker, setShowS3Picker] = useState(false)
  const localPickerRef = useRef<HTMLDivElement>(null)
  const s3PickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSavedPrompts(getAllPrompts())
  }, [])

  const fetchLocalFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/data/files')
      const data = await res.json()
      if (res.ok && Array.isArray(data.files)) {
        setLocalFiles(data.files.map((f: { id: string; originalName: string }) => ({ id: f.id, originalName: f.originalName })))
      }
    } catch {
      setLocalFiles([])
    }
  }, [])

  const fetchS3Files = useCallback(async () => {
    try {
      const res = await fetch('/api/data/s3-files')
      const data = await res.json()
      if (res.ok && Array.isArray(data.files)) {
        setS3Files(data.files.map((f: { key: string; size: number }) => ({ key: f.key, size: f.size })))
      }
    } catch {
      setS3Files([])
    }
  }, [])

  useEffect(() => {
    fetchLocalFiles()
  }, [fetchLocalFiles])

  useEffect(() => {
    if (showLocalPicker) fetchLocalFiles()
  }, [showLocalPicker, fetchLocalFiles])

  useEffect(() => {
    if (showS3Picker) fetchS3Files()
  }, [showS3Picker, fetchS3Files])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const t = e.target as Node
      if (showLocalPicker && localPickerRef.current && !localPickerRef.current.contains(t)) setShowLocalPicker(false)
      if (showS3Picker && s3PickerRef.current && !s3PickerRef.current.contains(t)) setShowS3Picker(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [showLocalPicker, showS3Picker])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPromptDropdown(false)
      }
    }
    if (showPromptDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPromptDropdown])

  const handleSelectPrompt = (p: SavedPrompt) => {
    setPrompt(p.content)
    setShowPromptDropdown(false)
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
    setGeneratingStep('loading')
    try {
      // 資料読み込み（今回は即時切り替えでもよいが少し見せるため待機）
      await new Promise(resolve => setTimeout(resolve, 800))
      
      setGeneratingStep('writing')
      const res = await fetch('/api/gemini/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmed,
          targetKeyword: article.targetKeyword ?? '',
          fileIds: selectedFileIds.length > 0 ? selectedFileIds : undefined,
          s3Keys: selectedS3Keys.length > 0 ? selectedS3Keys : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '一次執筆の生成に失敗しました')
      
      setGeneratingStep('done')
      await new Promise(resolve => setTimeout(resolve, 600))
      
      const title = typeof data.title === 'string' ? data.title.trim() : ''
      const content = typeof data.content === 'string' ? data.content : ''
      if (title) onTitleChange(title)
      if (content) onContentChange(content)
      setGenerating(false)
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : '一次執筆の生成に失敗しました')
      setGenerating(false)
    }
  }

  const handleClear = () => {
    setPrompt('')
    setSelectedFileIds([])
    setSelectedS3Keys([])
    setDraftError(null)
    onTitleChange('')
    onContentChange('')
    onClear?.()
  }

  return (
    <div className="w-full pt-6 pb-12">
      <div className="flex gap-8 items-start">
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          <Card className="relative overflow-hidden">
            {/* 生成中のローディングオーバーレイ */}
            {generating && <GeneratingLoader step={generatingStep} />}

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-[#1A1A2E] mb-0.5">一次執筆</h2>
                <p className="text-sm text-[#64748B]">
                  プロンプトで指示を出し、Geminiが記事のタイトル・本文を生成します。
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

            {/* プロンプト */}
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1.5 relative">
                  <label className="block text-sm font-semibold text-[#1A1A2E]">
                    プロンプト（指示）
                  </label>
                  {savedPrompts.length > 0 && (
                    <div className="relative" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => setShowPromptDropdown(!showPromptDropdown)}
                        className="text-xs text-[#002C93] font-medium hover:underline flex items-center gap-1"
                      >
                        保存済みプロンプトから入力 <ChevronDown size={14} />
                      </button>
                      {showPromptDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-[320px] bg-white border border-[#E2E8F0] shadow-lg rounded-lg z-10 max-h-[300px] overflow-y-auto">
                          {savedPrompts.map(p => (
                            <button
                              key={p.id}
                              onClick={() => handleSelectPrompt(p)}
                              className="w-full text-left px-4 py-3 border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC] transition-colors"
                            >
                              <div className="font-bold text-sm text-[#1A1A2E] mb-1">{p.title}</div>
                              <div className="text-xs text-[#64748B] line-clamp-2">{p.content}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
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

              {/* 参照資料（独自性アップ） */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-[#1A1A2E]">
                    参照資料（独自性アップ）
                  </label>
                  <span className="text-xs text-[#64748B]">記事に反映する資料を選べます</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedFileIds.map(id => {
                    const name = localFiles.find(f => f.id === id)?.originalName ?? id
                    return (
                      <span
                        key={`file-${id}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-[#F0F4FF] text-[#1B2A4A] border border-[#C7D7FF]"
                      >
                        <FileText size={12} />
                        {name}
                        <button
                          type="button"
                          onClick={() => setSelectedFileIds(prev => prev.filter(x => x !== id))}
                          className="p-0.5 rounded hover:bg-[#C7D7FF]/50"
                          aria-label="削除"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    )
                  })}
                  {selectedS3Keys.map(key => {
                    const name = key.split('/').pop() ?? key
                    return (
                      <span
                        key={`s3-${key}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]"
                      >
                        <Cloud size={12} />
                        {name}
                        <button
                          type="button"
                          onClick={() => setSelectedS3Keys(prev => prev.filter(x => x !== key))}
                          className="p-0.5 rounded hover:bg-[#A7F3D0]/50"
                          aria-label="削除"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    )
                  })}
                </div>
                <div className="flex gap-2 relative">
                  <div className="relative" ref={localPickerRef}>
                    <Button
                      type="button"
                      variant="secondary"
                      className="py-2 px-3 text-sm h-auto"
                      onClick={() => setShowLocalPicker(prev => !prev)}
                    >
                      <FileText size={14} className="mr-1.5" />
                      アップロード済みから選ぶ
                    </Button>
                    {showLocalPicker && (
                      <div className="absolute left-0 top-full mt-1 z-20 min-w-[220px] max-h-[200px] overflow-y-auto rounded-lg border border-[#E2E8F0] bg-white shadow-lg py-1">
                        {localFiles.length === 0 ? (
                          <p className="px-3 py-2 text-xs text-[#64748B]">読み込み中…</p>
                        ) : (
                          localFiles.map(f => (
                            <label
                              key={f.id}
                              className="flex items-center gap-2 px-3 py-2 hover:bg-[#F8FAFC] cursor-pointer text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={selectedFileIds.includes(f.id)}
                                onChange={e => {
                                  if (e.target.checked) setSelectedFileIds(prev => [...prev, f.id])
                                  else setSelectedFileIds(prev => prev.filter(x => x !== f.id))
                                }}
                                className="rounded border-[#E2E8F0]"
                              />
                              <span className="truncate">{f.originalName}</span>
                            </label>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <div className="relative" ref={s3PickerRef}>
                    <Button
                      type="button"
                      variant="secondary"
                      className="py-2 px-3 text-sm h-auto"
                      onClick={() => setShowS3Picker(prev => !prev)}
                    >
                      <Cloud size={14} className="mr-1.5" />
                      S3から選ぶ
                    </Button>
                    {showS3Picker && (
                      <div className="absolute left-0 top-full mt-1 z-20 min-w-[220px] max-h-[200px] overflow-y-auto rounded-lg border border-[#E2E8F0] bg-white shadow-lg py-1">
                        {s3Files.length === 0 ? (
                          <p className="px-3 py-2 text-xs text-[#64748B]">読み込み中…</p>
                        ) : (
                          s3Files.map(f => (
                            <label
                              key={f.key}
                              className="flex items-center gap-2 px-3 py-2 hover:bg-[#F8FAFC] cursor-pointer text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={selectedS3Keys.includes(f.key)}
                                onChange={e => {
                                  if (e.target.checked) setSelectedS3Keys(prev => [...prev, f.key])
                                  else setSelectedS3Keys(prev => prev.filter(x => x !== f.key))
                                }}
                                className="rounded border-[#E2E8F0]"
                              />
                              <span className="truncate" title={f.key}>{f.key.split('/').pop() ?? f.key}</span>
                            </label>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-start">
                <Button
                  variant="primary"
                  disabled={!prompt.trim() || generating}
                  onClick={handleGenerate}
                  className="py-3 px-6 h-auto"
                >
                  {generating ? (
                    <span className="font-bold text-base">記事を作成中...</span>
                  ) : (
                    <>
                      <Sparkles size={18} className="mr-2" />
                      <span className="font-bold text-base">記事作成</span>
                    </>
                  )}
                </Button>
              </div>

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

function GeneratingLoader({ step }: { step: string }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (step === 'loading') {
      setProgress(10)
    } else if (step === 'writing') {
      let currentProgress = 10
      timer = setInterval(() => {
        currentProgress += (95 - currentProgress) * 0.05
        setProgress(Math.floor(currentProgress))
      }, 500)
    } else if (step === 'done') {
      setProgress(100)
    }
    return () => clearInterval(timer)
  }, [step])

  const steps = [
    { key: 'loading', label: '資料を読み込んでいます' },
    { key: 'writing', label: 'Geminiが執筆しています' },
    { key: 'done', label: '完了' },
  ]

  const currentIndex = steps.findIndex(s => s.key === step)

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
    }}>
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        padding: '40px 48px',
        textAlign: 'center',
        maxWidth: 360,
        width: '100%',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        {/* アイコン */}
        <div style={{
          width: 56, height: 56,
          backgroundColor: '#f0fdf4',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: 24,
        }}>
          ✦
        </div>

        {/* メインテキスト */}
        <div style={{
          fontSize: 16, fontWeight: 600, color: '#111827',
          marginBottom: 6,
        }}>
          {steps[currentIndex]?.label ?? '処理中'}
        </div>
        <div style={{
          fontSize: 13, color: '#9ca3af',
          marginBottom: 20,
        }}>
          しばらくお待ちください
        </div>

        {/* プログレスバー */}
        <div style={{ marginBottom: 28, textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#111827', fontWeight: 600, marginBottom: 6 }}>
            <span>進行状況</span>
            <span>{progress}%</span>
          </div>
          <div style={{ width: '100%', height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ 
              width: `${progress}%`, 
              height: '100%', 
              backgroundColor: '#059669', 
              transition: 'width 0.5s ease-out' 
            }} />
          </div>
        </div>

        {/* ステップインジケーター */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
          {steps.slice(0, -1).map((s, i) => {
            const isDone = i < currentIndex
            const isActive = i === currentIndex
            return (
              <div key={s.key} style={{
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                  backgroundColor: isDone ? '#059669' : isActive ? '#111827' : '#f3f4f6',
                  color: isDone || isActive ? 'white' : '#9ca3af',
                  transition: 'all 0.3s',
                }}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: 13,
                  color: isDone ? '#059669' : isActive ? '#111827' : '#9ca3af',
                  fontWeight: isActive ? 600 : 400,
                }}>
                  {s.label}
                </span>
                {isActive && (
                  <span style={{
                    marginLeft: 'auto',
                    width: 16, height: 16,
                    border: '2px solid #e5e7eb',
                    borderTopColor: '#111827',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.8s linear infinite',
                    flexShrink: 0,
                  }} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

