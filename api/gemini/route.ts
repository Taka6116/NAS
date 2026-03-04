import { NextRequest, NextResponse } from 'next/server'
import { refineArticleWithGemini } from '@/lib/api/gemini'

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: '記事本文が必要です' },
        { status: 400 }
      )
    }

    const refinedContent = await refineArticleWithGemini(content)
    return NextResponse.json({ refinedContent })
  } catch (error) {
    console.error('Gemini API error:', error)
    return NextResponse.json(
      { error: 'Gemini APIの呼び出しに失敗しました' },
      { status: 500 }
    )
  }
}
