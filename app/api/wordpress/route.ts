import { NextRequest, NextResponse } from 'next/server'
import { publishToWordPress } from '@/lib/api/wordpress'

export async function POST(request: NextRequest) {
  try {
    const { title, content, imageUrl } = await request.json()

    if (!title || !content) {
      return NextResponse.json(
        { error: 'タイトルと本文が必要です' },
        { status: 400 }
      )
    }

    const wordpressUrl = await publishToWordPress(title, content, imageUrl || '')
    return NextResponse.json({ wordpressUrl })
  } catch (error) {
    console.error('WordPress API error:', error)
    return NextResponse.json(
      { error: 'WordPress APIの呼び出しに失敗しました' },
      { status: 500 }
    )
  }
}
