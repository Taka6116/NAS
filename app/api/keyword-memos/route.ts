import { NextRequest, NextResponse } from 'next/server'
import { getS3ObjectAsText, putS3Object } from '@/lib/s3Reference'

export const dynamic = 'force-dynamic'

const MEMOS_KEY = 'keyword-memos/ahrefs-memos.json'

/** KW分析ページのメモを S3 から全件取得 */
export async function GET() {
  try {
    const result = await getS3ObjectAsText(MEMOS_KEY)
    if (!result) {
      return NextResponse.json({ memos: {} })
    }
    const parsed = JSON.parse(result.content)
    const memos =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, string>)
        : {}
    return NextResponse.json({ memos })
  } catch (e) {
    console.error('[keyword-memos GET] error:', e)
    return NextResponse.json({ memos: {} })
  }
}

/** KW分析ページのメモを S3 に一括保存（全件上書き） */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const memos: Record<string, string> =
      body && typeof body === 'object' && !Array.isArray(body)
        ? (body as Record<string, string>)
        : {}

    const ok = await putS3Object(MEMOS_KEY, JSON.stringify(memos), 'application/json')
    if (!ok) {
      return NextResponse.json({ error: 'S3への保存に失敗しました' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[keyword-memos POST] error:', e)
    return NextResponse.json({ error: 'メモの保存に失敗しました' }, { status: 500 })
  }
}
