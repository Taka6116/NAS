'use client'

/**
 * キーワードライブラリの永続ストレージ。
 * データは /api/keyword-library 経由で S3 に保存される。
 * localStorage は表示用の楽観的キャッシュとしてのみ使用する。
 */

const LIBRARY_API = '/api/keyword-library'
const LOCAL_CACHE_KEY = 'nas_user_keywords_v2'

export interface SavedKeyword {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

/** S3 からキーワードライブラリを全件取得する。失敗時は localStorage キャッシュを返す。 */
export async function getAllKeywords(): Promise<SavedKeyword[]> {
  try {
    const res = await fetch(LIBRARY_API, { cache: 'no-store' })
    if (!res.ok) throw new Error(`GET ${res.status}`)
    const data = await res.json() as { keywords: SavedKeyword[] }
    const keywords = data.keywords ?? []
    try { localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(keywords)) } catch { /* ignore */ }
    return keywords
  } catch {
    // フォールバック: localStorage キャッシュ
    try {
      const raw = localStorage.getItem(LOCAL_CACHE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as SavedKeyword[]) : []
    } catch {
      return []
    }
  }
}

/** キーワードを新規作成 or 更新して S3 に保存する。 */
export async function saveKeyword(
  keyword: Omit<SavedKeyword, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<SavedKeyword[]> {
  const res = await fetch(LIBRARY_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(keyword),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error ?? 'キーワードの保存に失敗しました')
  }
  const data = await res.json() as { keywords: SavedKeyword[] }
  const keywords = data.keywords ?? []
  try { localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(keywords)) } catch { /* ignore */ }
  return keywords
}

/** キーワードを削除して S3 に保存する。 */
export async function deleteKeyword(id: string): Promise<SavedKeyword[]> {
  const res = await fetch(LIBRARY_API, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error ?? 'キーワードの削除に失敗しました')
  }
  const data = await res.json() as { keywords: SavedKeyword[] }
  const keywords = data.keywords ?? []
  try { localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(keywords)) } catch { /* ignore */ }
  return keywords
}

/**
 * 旧 localStorage（nas_user_keywords）に残っているデータを S3 にマイグレーションする。
 * S3 に既にデータがある場合はスキップする（S3 を正とする）。
 */
export async function migrateOldLocalStorageToS3(): Promise<void> {
  const OLD_KEY = 'nas_user_keywords'
  try {
    const raw = localStorage.getItem(OLD_KEY)
    if (!raw) return
    const local = JSON.parse(raw) as SavedKeyword[]
    if (!Array.isArray(local) || local.length === 0) return

    // S3 に既存データがあれば何もしない
    const s3Keywords = await getAllKeywords()
    if (s3Keywords.length > 0) {
      localStorage.removeItem(OLD_KEY)
      return
    }

    // S3 が空ならローカルデータを移行
    for (const kw of local) {
      await saveKeyword({ id: kw.id, title: kw.title, content: kw.content })
    }
    localStorage.removeItem(OLD_KEY)
    console.log('[keywordStorage] 旧 localStorage → S3 マイグレーション完了:', local.length, '件')
  } catch (e) {
    console.warn('[keywordStorage] マイグレーション失敗:', e)
  }
}
