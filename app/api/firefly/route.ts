import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithFirefly } from '@/lib/api/firefly'

export async function POST(request: NextRequest) {
  try {
    const { title, content } = await request.json()

    if (!title || !content) {
      return NextResponse.json(
        { error: 'タイトルと本文が必要です' },
        { status: 400 }
      )
    }

    const imageUrl = await generateImageWithFirefly(title, content)
    return NextResponse.json({ imageUrl })
  } catch (error) {
    console.error('Firefly API error:', error)
    return NextResponse.json(
      { error: 'Firefly APIの呼び出しに失敗しました' },
      { status: 500 }
    )
  }
}
