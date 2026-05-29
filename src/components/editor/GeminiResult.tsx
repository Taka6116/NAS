'use client'

import { useState, useEffect } from 'react'
import { ArticleData, ProcessingState, Step } from '@/lib/types'
import StepIndicator from './StepIndicator'
import Button from '@/components/ui/Button'
import GeminiLoadingCard from './GeminiLoadingCard'
import { ArrowLeft, ArrowRight, ClipboardCopy, Check, CheckCircle, Eraser } from 'lucide-react'

interface GeminiResultProps {
  article: ArticleData
  geminiStatus: ProcessingState
  geminiError?: string | null
  showCompletionToast?: boolean
  onCompletionToastShown?: () => void
  onRefinedTitleChange?: (title: string) => void
  onRefinedContentChange: (content: string) => void
  onBack: () => void
  onNext: () => void
  onRetry?: () => void
  onStepClick?: (step: Step) => void
}

export default function GeminiResult({
  article,
  geminiStatus,
  geminiError,
  showCompletionToast,
  onCompletionToastShown,
  onRefinedTitleChange,
  onRefinedContentChange,
  onBack,
  onNext,
  onRetry,
  onStepClick,
}: GeminiResultProps) {
  const [copied, setCopied] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const refinedContent = typeof article.refinedContent === 'string' ? article.refinedContent : ''
  const leftTitle = article.geminiSourceSnapshot?.title ?? article.title
  const leftBody = article.geminiSourceSnapshot?.content ?? article.originalContent

  useEffect(() => {
    if (geminiStatus === 'success' && showCompletionToast) {
      setShowToast(true)
      onCompletionToastShown?.()
      const t = setTimeout(() => setShowToast(false), 2500)
      return () => clearTimeout(t)
    }
  }, [geminiStatus, showCompletionToast, onCompletionToastShown])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(refinedContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // マークダウン強調 **...** / *...* を本文から一括除去する。
  // 見出し記号（1. / 1-1. / ■ など）は触らず、内側のテキストだけ残す。
  const handleStripBold = () => {
    if (!refinedContent) return
    let cleaned = refinedContent
    let prev = ''
    while (cleaned !== prev) {
      prev = cleaned
      cleaned = cleaned.replace(/\*\*([\s\S]*?)\*\*/g, '$1')
    }
    cleaned = cleaned
      .replace(/\*\*/g, '')
      .replace(/(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/g, '$1')
      .replace(/\*/g, '')
    if (cleaned !== refinedContent) {
      onRefinedContentChange(cleaned)
    }
  }

  return (
    <div className="w-full pt-6 pb-12">
      {/* Page header */}
      <div className="mb-5">
        <p className="text-xs font-bold tracking-[0.11em] uppercase mb-0.5" style={{ color: 'var(--primary)' }}>
          Refinement Review Studio
        </p>
        <h2 className="text-base font-bold" style={{ color: 'var(--ink)' }}>推敲前 / 推敲後の比較</h2>
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Main column ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">

          {/* Loading */}
          {geminiStatus === 'loading' && (
            <div className="w-full flex flex-col items-center">
              <div className="w-full max-w-4xl space-y-3">
                <GeminiLoadingCard />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  推敲中です。キャンセルする場合は下の「記事を修正する」で戻れます。
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {geminiStatus === 'error' && geminiError && (
            <div
              className="rounded-[12px] px-5 py-4 space-y-3"
              style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}
            >
              <p className="text-sm font-semibold" style={{ color: '#991b1b' }}>推敲できませんでした</p>
              <p className="text-sm" style={{ color: '#b91c1c' }}>{geminiError}</p>
              {onRetry && (
                <Button variant="primary" size="md" onClick={onRetry}>
                  再度推敲する
                </Button>
              )}
            </div>
          )}

          {/* 2-pane comparison */}
          {(geminiStatus === 'success' || geminiStatus === 'error') && (
            <div
              className="grid grid-cols-2 rounded-[16px] overflow-hidden"
              style={{
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              {/* ── Left pane: Original Draft ── */}
              <div
                className="flex flex-col"
                style={{ background: 'rgba(241,245,249,0.80)', borderRight: '1px solid var(--border)' }}
              >
                {/* Pane header */}
                <div
                  className="flex items-center justify-between px-5 py-3"
                  style={{ borderBottom: '1px solid var(--border)', background: 'rgba(241,245,249,0.60)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      元の記事
                    </span>
                    <span
                      className="nas-badge"
                      style={{ background: 'rgba(20,44,92,0.07)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                    >
                      推敲開始時点
                    </span>
                  </div>
                  {/* spacer to match right pane button height */}
                  <button
                    type="button"
                    aria-hidden="true"
                    tabIndex={-1}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs opacity-0"
                  >
                    <ClipboardCopy size={13} />
                    全文コピー
                  </button>
                </div>

                {/* Title */}
                <div
                  className="px-5 py-3"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                    記事タイトル
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={leftTitle}
                    className="w-full px-4 py-2 rounded-[9px] text-sm"
                    style={{
                      background: 'rgba(20,44,92,0.04)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Body */}
                <textarea
                  readOnly
                  value={leftBody}
                  className="flex-1 px-5 py-4 text-sm resize-none focus:outline-none min-h-[520px] max-h-[72vh]"
                  style={{
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    lineHeight: '1.75',
                  }}
                />
              </div>

              {/* ── Right pane: Refined ── */}
              <div
                className="flex flex-col"
                style={{ background: 'var(--surface-raised)' }}
              >
                {/* Pane header */}
                <div
                  className="flex items-center justify-between px-5 py-3"
                  style={{ borderBottom: '1px solid var(--border)', background: 'rgba(240,253,244,0.60)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--success)' }}>
                      AI 改善後
                    </span>
                    <span
                      className="nas-badge"
                      style={{ background: 'rgba(15,159,110,0.09)', color: '#065f46', border: '1px solid rgba(15,159,110,0.25)' }}
                    >
                      <span className="nas-badge-dot" style={{ background: 'var(--success)' }} />
                      AI推敲済み
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleStripBold}
                      title="本文中の ** / * （マークダウン強調）を全て削除します"
                      className="inline-flex items-center gap-1.5 min-h-[30px] px-3 rounded-[8px] text-xs font-semibold transition-all duration-120"
                      style={{
                        background: 'rgba(20,44,92,0.06)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-muted)',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.background = '#fffbeb'
                        el.style.color = '#b45309'
                        el.style.borderColor = '#fcd34d'
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.background = 'rgba(20,44,92,0.06)'
                        el.style.color = 'var(--text-muted)'
                        el.style.borderColor = 'var(--border)'
                      }}
                    >
                      <Eraser size={13} />
                      ** を一括削除
                    </button>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1.5 min-h-[30px] px-3 rounded-[8px] text-xs font-semibold transition-all duration-120"
                      style={{
                        background: copied ? 'rgba(15,159,110,0.09)' : 'rgba(18,103,242,0.08)',
                        border: `1px solid ${copied ? 'rgba(15,159,110,0.25)' : 'rgba(18,103,242,0.22)'}`,
                        color: copied ? 'var(--success)' : 'var(--primary)',
                      }}
                    >
                      {copied ? (
                        <>
                          <Check size={13} />
                          コピー済み
                        </>
                      ) : (
                        <>
                          <ClipboardCopy size={13} />
                          全文コピー
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Title (editable) */}
                <div
                  className="px-5 py-3"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--success)' }}>
                    記事タイトル
                  </label>
                  <input
                    type="text"
                    value={article.refinedTitle || article.title}
                    onChange={e => onRefinedTitleChange?.(e.target.value)}
                    placeholder="推敲後のタイトル"
                    className="w-full px-4 py-2 rounded-[9px] text-sm transition-all duration-150"
                    style={{
                      border: '1px solid rgba(15,159,110,0.30)',
                      background: 'rgba(255,255,255,0.92)',
                      color: 'var(--ink)',
                      boxShadow: 'inset 0 1px 3px rgba(20,44,92,0.04)',
                      outline: 'none',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = 'var(--success)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15,159,110,0.14), inset 0 1px 3px rgba(20,44,92,0.04)'
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'rgba(15,159,110,0.30)'
                      e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(20,44,92,0.04)'
                    }}
                  />
                </div>

                {/* Body (editable) */}
                <textarea
                  value={refinedContent}
                  onChange={e => onRefinedContentChange(e.target.value)}
                  className="flex-1 px-5 py-4 text-sm resize-none min-h-[520px] max-h-[72vh] transition-all duration-150"
                  style={{
                    background: 'transparent',
                    color: 'var(--ink)',
                    lineHeight: '1.75',
                    outline: 'none',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.boxShadow = 'inset 0 0 0 2px rgba(18,103,242,0.15)'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Step rail ── */}
        <div className="flex-shrink-0 w-[140px] pt-2">
          <StepIndicator currentStep={2} onStepClick={onStepClick} />
        </div>
      </div>

      {/* ── Bottom navigation ── */}
      <div className="flex justify-between mt-8">
        <Button variant="ghost" size="md" onClick={onBack}>
          <ArrowLeft size={16} />
          記事を修正する
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={onNext}
          disabled={geminiStatus !== 'success' || !refinedContent.trim()}
        >
          画像を生成する
          <ArrowRight size={18} />
        </Button>
      </div>

      {/* ── Completion toast ── */}
      <div
        className={`
          fixed bottom-6 right-6 z-50
          flex items-center gap-2 px-4 py-3 rounded-[12px]
          text-sm font-semibold text-white
          transition-all duration-300
          ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}
        `}
        style={{
          background: 'linear-gradient(135deg, #0f9f6e 0%, #18a9e6 100%)',
          boxShadow: '0 8px 24px rgba(15,159,110,0.35)',
        }}
      >
        <CheckCircle size={16} />
        AI による推敲が完了しました
      </div>
    </div>
  )
}
