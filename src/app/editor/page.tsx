'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Step, ArticleData, ProcessingState } from '@/lib/types'
import { applyInternalLinksToHtml } from '@/lib/internalLinks'
import { getArticleById, saveArticle, updateArticleStatus } from '@/lib/articleStorage'
import ArticleInput from '@/components/editor/ArticleInput'
import GeminiResult from '@/components/editor/GeminiResult'
import ImageResult from '@/components/editor/ImageResult'
import PublishResult from '@/components/editor/PublishResult'

const STORAGE_KEY = 'nas_editor_state'

const initialArticle: ArticleData = {
  title: '',
  originalContent: '',
  refinedContent: '',
  refinedTitle: '',
  targetKeyword: '',
  internalLinks: [],
  imageUrl: '',
  wordpressUrl: undefined,
}

interface SavedState {
  article: ArticleData
  currentStep: Step
  geminiStatus: ProcessingState
  fireflyStatus: ProcessingState
}

function loadState(): SavedState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedState
  } catch {
    return null
  }
}

function saveState(state: SavedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

export default function EditorPage() {
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [currentArticleId, setCurrentArticleId] = useState<string | null>(null)
  const [article, setArticle] = useState<ArticleData>(initialArticle)
  const [geminiStatus, setGeminiStatus] = useState<ProcessingState>('idle')
  const [geminiError, setGeminiError] = useState<string | null>(null)
  const [fireflyStatus, setFireflyStatus] = useState<ProcessingState>('idle')
  const [wordpressStatus, setWordpressStatus] = useState<ProcessingState>('idle')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const articleId = searchParams.get('articleId')
    const stepParam = searchParams.get('step')

    if (articleId) {
      const savedArticle = getArticleById(articleId)
      if (savedArticle) {
        setArticle({
          title: savedArticle.title,
          refinedTitle: savedArticle.refinedTitle,
          targetKeyword: savedArticle.targetKeyword,
          originalContent: savedArticle.originalContent,
          refinedContent: savedArticle.refinedContent,
          imageUrl: savedArticle.imageUrl,
          internalLinks: [],
          wordpressUrl: savedArticle.wordpressUrl,
        })
        setCurrentArticleId(savedArticle.id)
        const parsedStep = Number(stepParam)
        if ([1, 2, 3, 4].includes(parsedStep)) {
          setCurrentStep(parsedStep as Step)
        }
        setGeminiStatus(savedArticle.refinedContent ? 'success' : 'idle')
        setFireflyStatus(savedArticle.imageUrl ? 'success' : 'idle')
        setMounted(true)
        return
      }
    }

    const saved = loadState()
    if (saved) {
      setArticle(saved.article)
      // 旧5ステップの保存値は4ステップにマッピング（内部リンク削除済み）
      const step = saved.currentStep as number
      const mappedStep = step === 5 ? 4 : step === 4 ? 3 : step
      setCurrentStep(mappedStep as Step)
      setGeminiStatus(saved.geminiStatus === 'loading' ? 'idle' : saved.geminiStatus)
      setFireflyStatus(saved.fireflyStatus === 'loading' ? 'idle' : saved.fireflyStatus)
    }
    setMounted(true)
  }, [searchParams])

  useEffect(() => {
    if (!mounted) return
    saveState({ article, currentStep, geminiStatus, fireflyStatus })
  }, [article, currentStep, geminiStatus, fireflyStatus, mounted])

  const updateArticle = useCallback((updates: Partial<ArticleData>) => {
    setArticle(prev => ({ ...prev, ...updates }))
  }, [])

  const callGeminiApi = useCallback(async () => {
    setGeminiError(null)
    setGeminiStatus('loading')
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          content: article.originalContent,
          targetKeyword: article.targetKeyword ?? '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '推敲に失敗しました')
      const refinedTitle =
        typeof data.refinedTitle === 'string' && data.refinedTitle.trim().length > 0
          ? data.refinedTitle
          : article.title
      const refinedContent =
        typeof data.refinedContent === 'string' ? data.refinedContent.trim() : ''
      if (!refinedContent) {
        throw new Error('Geminiの推敲結果が空です。再度お試しください。')
      }
      updateArticle({ refinedTitle, refinedContent })
      setGeminiStatus('success')
    } catch (e) {
      setGeminiStatus('error')
      setGeminiError(e instanceof Error ? e.message : '推敲に失敗しました')
    }
  }, [article.title, article.originalContent, article.targetKeyword, updateArticle])

  const handleStep1Next = useCallback(async () => {
    setCurrentStep(2)
    await callGeminiApi()
  }, [callGeminiApi])

  const handleStep2Next = useCallback(() => setCurrentStep(3), [])

  const triggerFirefly = useCallback(async () => {
    setFireflyStatus('loading')
    try {
      const res = await fetch('/api/firefly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.refinedTitle?.trim() || article.title,
          content: article.refinedContent,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      updateArticle({ imageUrl: data.imageUrl })
      setFireflyStatus('success')
    } catch {
      setFireflyStatus('error')
    }
  }, [article.title, article.refinedTitle, article.refinedContent, updateArticle])

  const handleImageUpload = useCallback(
    (imageUrl: string) => {
      updateArticle({ imageUrl })
      setFireflyStatus('success')
    },
    [updateArticle]
  )

  useEffect(() => {
    if (!mounted || currentStep !== 3) return
    if (article.imageUrl) {
      setFireflyStatus('success')
      return
    }
    if (fireflyStatus === 'idle') {
      triggerFirefly()
    }
  }, [mounted, currentStep, article.imageUrl, fireflyStatus, triggerFirefly])

  const handleStep3NextComplete = useCallback(() => setCurrentStep(4), [])

  const handleSaveDraft = useCallback(() => {
    const id = currentArticleId ?? String(Date.now())
    setCurrentArticleId(id)

    const existing = getArticleById(id)
    saveArticle({
      id,
      title: article.title,
      refinedTitle: article.refinedTitle ?? article.title,
      targetKeyword: article.targetKeyword ?? '',
      originalContent: article.originalContent,
      refinedContent: article.refinedContent,
      imageUrl: article.imageUrl,
      wordpressUrl: article.wordpressUrl,
      status: article.imageUrl ? 'ready' : 'draft',
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      scheduledDate: existing?.scheduledDate,
      wordCount: article.refinedContent.length,
    })

    alert('下書きを保存しました')
  }, [article, currentArticleId])

  const handleRegenerate = useCallback(async () => {
    setFireflyStatus('loading')
    updateArticle({ imageUrl: '' })
    try {
      const res = await fetch('/api/firefly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: article.title, content: article.refinedContent }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      updateArticle({ imageUrl: data.imageUrl })
      setFireflyStatus('success')
    } catch {
      setFireflyStatus('error')
    }
  }, [article.title, article.refinedContent, updateArticle])

  const handlePublish = useCallback(async () => {
    setWordpressStatus('loading')
    try {
      const contentWithLinks = applyInternalLinksToHtml(
        article.refinedContent,
        article.internalLinks ?? []
      )
      const publishTitle = article.refinedTitle?.trim() || article.title
      const res = await fetch('/api/wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: publishTitle,
          content: contentWithLinks,
          imageUrl: article.imageUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      updateArticle({ wordpressUrl: data.wordpressUrl })
      if (currentArticleId) {
        updateArticleStatus(currentArticleId, 'published', data.wordpressUrl)
      } else {
        const newId = String(Date.now())
        setCurrentArticleId(newId)
        saveArticle({
          id: newId,
          title: article.title,
          refinedTitle: article.refinedTitle ?? article.title,
          targetKeyword: article.targetKeyword ?? '',
          originalContent: article.originalContent,
          refinedContent: article.refinedContent,
          imageUrl: article.imageUrl,
          wordpressUrl: data.wordpressUrl,
          status: 'published',
          createdAt: new Date().toISOString(),
          wordCount: article.refinedContent.length,
        })
      }
      setWordpressStatus('success')
    } catch {
      setWordpressStatus('error')
    }
  }, [
    article.title,
    article.refinedTitle,
    article.targetKeyword,
    article.originalContent,
    article.refinedContent,
    article.internalLinks,
    article.imageUrl,
    currentArticleId,
    updateArticle,
  ])

  const handleReset = useCallback(() => {
    clearState()
    setCurrentStep(1)
    setArticle(initialArticle)
    setGeminiStatus('idle')
    setGeminiError(null)
    setFireflyStatus('idle')
    setWordpressStatus('idle')
  }, [])

  const handleClearArticle = useCallback(() => {
    setArticle(initialArticle)
    setGeminiStatus('idle')
    setGeminiError(null)
    setFireflyStatus('idle')
    setWordpressStatus('idle')
    setCurrentStep(1)
  }, [])

  // サーバー・クライアントとも初回は null で一致させ、マウント後に描画（ハイドレーション回避）
  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <main className="pb-16">
        {currentStep === 1 && (
          <ArticleInput
            article={article}
            onTitleChange={title => updateArticle({ title })}
            onContentChange={content => updateArticle({ originalContent: content })}
          onTargetKeywordChange={kw => updateArticle({ targetKeyword: kw })}
            onNext={handleStep1Next}
            onClear={handleClearArticle}
            onStepClick={setCurrentStep}
          />
        )}
        {currentStep === 2 && (
          <GeminiResult
            article={article}
            geminiStatus={geminiStatus}
            geminiError={geminiError}
            onRefinedTitleChange={refinedTitle => updateArticle({ refinedTitle })}
            onRefinedContentChange={refinedContent => updateArticle({ refinedContent })}
            onBack={() => setCurrentStep(1)}
            onNext={handleStep2Next}
            onRetry={callGeminiApi}
            onStepClick={setCurrentStep}
          />
        )}
        {currentStep === 3 && (
          <ImageResult
            article={article}
            fireflyStatus={fireflyStatus}
            onBack={() => setCurrentStep(2)}
          onSaveDraft={handleSaveDraft}
            onNext={handleStep3NextComplete}
            onRegenerate={handleRegenerate}
            onImageUpload={handleImageUpload}
            onStepClick={setCurrentStep}
          />
        )}
        {currentStep === 4 && (
          <PublishResult
            article={article}
            wordpressStatus={wordpressStatus}
            onBack={() => setCurrentStep(3)}
            onPublish={handlePublish}
            onReset={handleReset}
            onStepClick={setCurrentStep}
          />
        )}
      </main>
    </div>
  )
}
