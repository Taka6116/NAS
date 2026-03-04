import { NextRequest, NextResponse } from 'next/server'
import { refineArticleWithGemini } from '@/lib/api/gemini'

export async function POST(request: NextRequest) {
  try {
    const { title, content } = await request.json()
    const titleStr = typeof title === 'string' ? title : ''
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: '記事本文が必要です' },
        { status: 400 }
      )
    }

    const { refinedTitle, refinedContent } = await refineArticleWithGemini(titleStr, content)
    return NextResponse.json({ refinedTitle, refinedContent })
  } catch (error) {
    console.error('Gemini API error:', error)
    const message =
      error instanceof Error ? error.message : 'Gemini APIの呼び出しに失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
