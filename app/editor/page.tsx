'use client'

import { useState, useCallback } from 'react'
import { Step, ArticleData, ProcessingState } from '@/lib/types'
import { applyInternalLinksToHtml } from '@/lib/internalLinks'
import Header from '@/components/layout/Header'
import ArticleInput from '@/components/editor/ArticleInput'
import GeminiResult from '@/components/editor/GeminiResult'
import InternalLinkStep from '@/components/editor/InternalLinkStep'
import ImageResult from '@/components/editor/ImageResult'
import PublishResult from '@/components/editor/PublishResult'

const initialArticle: ArticleData = {
  title: '',
  originalContent: '',
  refinedContent: '',
  internalLinks: [],
  imageUrl: '',
  wordpressUrl: undefined,
}

export default function EditorPage() {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [article, setArticle] = useState<ArticleData>(initialArticle)
  const [geminiStatus, setGeminiStatus] = useState<ProcessingState>('idle')
  const [geminiError, setGeminiError] = useState<string | null>(null)
  const [fireflyStatus, setFireflyStatus] = useState<ProcessingState>('idle')
  const [wordpressStatus, setWordpressStatus] = useState<ProcessingState>('idle')

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
        body: JSON.stringify({ content: article.originalContent }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '推敲に失敗しました')
      updateArticle({ refinedContent: data.refinedContent })
      setGeminiStatus('success')
    } catch (e) {
      setGeminiStatus('error')
      setGeminiError(e instanceof Error ? e.message : '推敲に失敗しました')
    }
  }, [article.originalContent, updateArticle])

  const handleStep1Next = useCallback(async () => {
    setCurrentStep(2)
    await callGeminiApi()
  }, [callGeminiApi])

  const handleStep2Next = useCallback(() => {
    setCurrentStep(3)
  }, [])

  const handleStep3Next = useCallback(async () => {
    setCurrentStep(4)
    setFireflyStatus('loading')
    try {
      const res = await fetch('/api/firefly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
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
  }, [article.title, article.refinedContent, updateArticle])

  const handleStep4Next = useCallback(() => {
    setCurrentStep(5)
  }, [])

  const handleRegenerate = useCallback(async () => {
    setFireflyStatus('loading')
    try {
      const res = await fetch('/api/firefly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
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
  }, [article.title, article.refinedContent, updateArticle])

  const handlePublish = useCallback(async () => {
    setWordpressStatus('loading')
    try {
      const contentWithLinks = applyInternalLinksToHtml(
        article.refinedContent,
        article.internalLinks ?? []
      )
      const res = await fetch('/api/wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          content: contentWithLinks,
          imageUrl: article.imageUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      updateArticle({ wordpressUrl: data.wordpressUrl })
      setWordpressStatus('success')
    } catch {
      setWordpressStatus('error')
    }
  }, [article.title, article.refinedContent, article.internalLinks, article.imageUrl, updateArticle])

  const handleReset = useCallback(() => {
    setCurrentStep(1)
    setArticle(initialArticle)
    setGeminiStatus('idle')
    setGeminiError(null)
    setFireflyStatus('idle')
    setWordpressStatus('idle')
  }, [])

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <Header currentStep={currentStep} />

      <main className="pb-16">
        {currentStep === 1 && (
          <ArticleInput
            article={article}
            onTitleChange={title => updateArticle({ title })}
            onContentChange={content => updateArticle({ originalContent: content })}
            onNext={handleStep1Next}
          />
        )}

        {currentStep === 2 && (
          <GeminiResult
            article={article}
            geminiStatus={geminiStatus}
            geminiError={geminiError}
            onRefinedContentChange={refinedContent => updateArticle({ refinedContent })}
            onBack={() => setCurrentStep(1)}
            onNext={handleStep2Next}
            onRetry={callGeminiApi}
          />
        )}

        {currentStep === 3 && (
          <InternalLinkStep
            article={article}
            onInternalLinksChange={internalLinks => updateArticle({ internalLinks })}
            onBack={() => setCurrentStep(2)}
            onNext={handleStep3Next}
          />
        )}

        {currentStep === 4 && (
          <ImageResult
            article={article}
            fireflyStatus={fireflyStatus}
            onBack={() => setCurrentStep(3)}
            onNext={handleStep4Next}
            onRegenerate={handleRegenerate}
          />
        )}

        {currentStep === 5 && (
          <PublishResult
            article={article}
            wordpressStatus={wordpressStatus}
            onPublish={handlePublish}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  )
}
