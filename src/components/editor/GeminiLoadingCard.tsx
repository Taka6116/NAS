'use client'

import { useEffect, useState } from 'react'

const STEPS = [
  { label: '記事を読み込んでいます',      detail: '文章構造・段落・キーワードを解析中...' },
  { label: 'SEO品質をチェックしています', detail: '見出し構成・キーワード密度・読みやすさを確認中...' },
  { label: '文章を改善しています',        detail: 'より自然で説得力のある表現に書き直し中...' },
  { label: '最終チェックをしています',    detail: 'M&A業界の専門性・正確性を確認中...' },
]

export default function GeminiLoadingCard() {
  const [activeStep, setActiveStep] = useState(0)
  const [progress,   setProgress]   = useState(0)
  const [dots,       setDots]       = useState('')

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setActiveStep(prev => (prev < STEPS.length - 1 ? prev + 1 : prev))
    }, 4000)
    return () => clearInterval(stepTimer)
  }, [])

  useEffect(() => {
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 98) return 98
        const remaining = 98 - prev
        let step: number
        if (prev >= 80) {
          step = Math.max(0.03, remaining * 0.008)
        } else if (prev >= 60) {
          step = Math.max(0.06, remaining * 0.02)
        } else if (prev >= 40) {
          step = Math.max(0.1, remaining * 0.03)
        } else {
          step = Math.max(0.15, remaining * 0.05)
        }
        return prev + step
      })
    }, 220)
    return () => clearInterval(progressTimer)
  }, [])

  useEffect(() => {
    const dotsTimer = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)
    return () => clearInterval(dotsTimer)
  }, [])

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'white',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.06)',
      }}
    >
      {/* 上部：タイトル */}
      <div
        className="px-8 pt-10 pb-6 flex flex-col items-center text-center"
        style={{ background: 'linear-gradient(180deg, #EFF6FF 0%, white 100%)' }}
      >
        {/* グラデーション二重リング（アイコンなし） */}
        <div className="relative w-20 h-20 mb-5">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: '2px solid transparent',
              borderTopColor: '#0055ff',
              borderRightColor: 'rgba(0,85,255,0.25)',
              animation: 'spin 1.2s linear infinite',
            }}
          />
          <div
            className="absolute inset-2 rounded-full"
            style={{
              border: '2px solid transparent',
              borderTopColor: '#00b4ff',
              borderLeftColor: 'rgba(0,180,255,0.25)',
              animation: 'spin 2s linear infinite reverse',
            }}
          />
          <div
            className="absolute inset-5 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #0055ff 0%, #00b4ff 100%)',
              opacity: 0.15,
            }}
          />
        </div>

        <h3 className="text-lg font-bold mb-1" style={{ color: '#1A1A2E' }}>
          AI が記事を推敲中{dots}
        </h3>
        <p className="text-sm" style={{ color: '#64748B' }}>
          品質・読みやすさ・SEOを自動改善しています
        </p>
      </div>

      {/* 処理ステップリスト */}
      <div className="px-8 py-6 space-y-3">
        {STEPS.map((step, index) => {
          const isDone   = index < activeStep
          const isActive = index === activeStep
          const isWait   = index > activeStep

          return (
            <div
              key={index}
              className="flex items-start gap-3 transition-all duration-500"
              style={{ opacity: isWait ? 0.35 : 1 }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-300"
                style={{
                  background: isDone
                    ? 'linear-gradient(135deg, #0055ff 0%, #00b4ff 100%)'
                    : isActive
                    ? 'rgba(0,85,255,0.08)'
                    : '#F1F5F9',
                  border: isActive ? '2px solid #0055ff' : 'none',
                }}
              >
                {isDone ? (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : isActive ? (
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, #0055ff 0%, #00b4ff 100%)',
                      animation: 'pulse 1s ease infinite',
                    }}
                  />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#CBD5E1' }} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium transition-colors duration-300"
                  style={{ color: isDone ? '#64748B' : isActive ? '#1A1A2E' : '#94A3B8' }}
                >
                  {step.label}
                  {isDone && (
                    <span
                      className="ml-2 text-xs px-2 py-0.5 rounded-full font-mono"
                      style={{ background: '#EFF6FF', color: '#0055ff' }}
                    >
                      完了
                    </span>
                  )}
                </p>
                {isActive && (
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: '#94A3B8', animation: 'fadeIn 0.4s ease' }}
                  >
                    {step.detail}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* プログレスバー */}
      <div className="px-8 pb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono" style={{ color: '#94A3B8' }}>
            処理中
          </span>
          <span
            className="text-xs font-medium font-mono"
            style={{ background: 'linear-gradient(135deg,#0055ff,#00b4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#E2E8F0' }}>
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #0055ff 0%, #00b4ff 100%)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
