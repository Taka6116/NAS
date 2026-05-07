import { NextRequest, NextResponse } from 'next/server'
import { getS3ObjectAsText, putS3Object } from '@/lib/s3Reference'

export const dynamic = 'force-dynamic'

const LIBRARY_KEY = 'keyword-memos/keyword-library.json'

export interface SavedKeywordS3 {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

async function loadAll(): Promise<SavedKeywordS3[]> {
  const result = await getS3ObjectAsText(LIBRARY_KEY)
  if (!result) return []
  try {
    const parsed = JSON.parse(result.content)
    return Array.isArray(parsed) ? (parsed as SavedKeywordS3[]) : []
  } catch {
    return []
  }
}

async function saveAll(keywords: SavedKeywordS3[]): Promise<boolean> {
  return putS3Object(LIBRARY_KEY, JSON.stringify(keywords), 'application/json')
}

/** キーワードライブラリを S3 から全件取得 */
export async function GET() {
  try {
    const keywords = await loadAll()
    return NextResponse.json({ keywords })
  } catch (e) {
    console.error('[keyword-library GET] error:', e)
    return NextResponse.json({ keywords: [] })
  }
}

/** キーワードを新規作成 or 更新して S3 に保存 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<SavedKeywordS3>
    if (!body.title?.trim() || !body.content?.trim()) {
      return NextResponse.json({ error: 'title と content は必須です' }, { status: 400 })
    }

    const keywords = await loadAll()
    const now = new Date().toISOString()

    if (body.id) {
      const idx = keywords.findIndex(k => k.id === body.id)
      if (idx >= 0) {
        keywords[idx] = {
          ...keywords[idx]!,
          title: body.title.trim(),
          content: body.content.trim(),
          updatedAt: now,
        }
      } else {
        keywords.push({
          id: body.id,
          title: body.title.trim(),
          content: body.content.trim(),
          createdAt: now,
          updatedAt: now,
        })
      }
    } else {
      const newId = String(Date.now())
      keywords.push({
        id: newId,
        title: body.title.trim(),
        content: body.content.trim(),
        createdAt: now,
        updatedAt: now,
      })
    }

    const ok = await saveAll(keywords)
    if (!ok) {
      return NextResponse.json({ error: 'S3への保存に失敗しました' }, { status: 500 })
    }
    return NextResponse.json({ success: true, keywords })
  } catch (e) {
    console.error('[keyword-library POST] error:', e)
    return NextResponse.json({ error: 'キーワードの保存に失敗しました' }, { status: 500 })
  }
}

/** キーワードを削除して S3 に保存 */
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json() as { id?: string }
    if (!id) {
      return NextResponse.json({ error: 'id は必須です' }, { status: 400 })
    }

    const keywords = await loadAll()
    const filtered = keywords.filter(k => k.id !== id)
    const ok = await saveAll(filtered)
    if (!ok) {
      return NextResponse.json({ error: 'S3への保存に失敗しました' }, { status: 500 })
    }
    return NextResponse.json({ success: true, keywords: filtered })
  } catch (e) {
    console.error('[keyword-library DELETE] error:', e)
    return NextResponse.json({ error: 'キーワードの削除に失敗しました' }, { status: 500 })
  }
}
