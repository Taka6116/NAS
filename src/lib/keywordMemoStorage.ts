'use client'

/**
 * KW分析ページのメモを S3 経由（/api/keyword-memos）で永続管理するクライアント。
 * localStorage をキャッシュ兼フォールバックとして使い、
 * S3 への書き込みは debounce で 1.5 秒後にまとめて行う。
 */

const MEMO_API = '/api/keyword-memos'
const LOCAL_CACHE_KEY = 'nas_ahrefs_keyword_memos_v1'

let saveTimer: ReturnType<typeof setTimeout> | null = null

/** S3 からメモを全件ロードする。localStorage のキャッシュがあればまずそちらを返す。 */
export async function loadMemos(): Promise<Record<string, string>> {
  try {
    const res = await fetch(MEMO_API, { cache: 'no-store' })
    if (!res.ok) throw new Error(`GET ${res.status}`)
    const data = await res.json() as { memos: Record<string, string> }
    const memos = data.memos ?? {}
    // S3 の内容でローカルキャッシュを更新
    try { localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(memos)) } catch { /* ignore */ }
    return memos
  } catch {
    // フォールバック: localStorage のキャッシュ
    try {
      const raw = localStorage.getItem(LOCAL_CACHE_KEY)
      if (!raw) return {}
      const parsed = JSON.parse(raw)
      return (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
        ? (parsed as Record<string, string>)
        : {}
    } catch {
      return {}
    }
  }
}

/**
 * メモを S3 に保存する（debounce 1.5 秒）。
 * localStorage キャッシュは即時更新し、S3 保存は少し遅らせてまとめる。
 */
export function saveMemos(memos: Record<string, string>): void {
  try { localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(memos)) } catch { /* ignore */ }

  if (saveTimer !== null) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    void (async () => {
      try {
        await fetch(MEMO_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(memos),
        })
      } catch (e) {
        console.warn('[keywordMemoStorage] S3 保存失敗（ローカルキャッシュは残ります）:', e)
      }
    })()
  }, 1500)
}

/** localStorage に残っている古いキャッシュを S3 にマイグレーションする（初回のみ）。 */
export async function migrateLocalStorageToS3(
  s3Memos: Record<string, string>
): Promise<Record<string, string>> {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY)
    if (!raw) return s3Memos
    const local = JSON.parse(raw) as Record<string, string>
    if (!local || typeof local !== 'object' || Array.isArray(local)) return s3Memos

    const localKeys = Object.keys(local)
    if (localKeys.length === 0) return s3Memos

    // S3 にないキーだけ取り込む（S3 側を優先）
    let changed = false
    const merged = { ...s3Memos }
    for (const k of localKeys) {
      if (!(k in merged) && local[k]?.trim()) {
        merged[k] = local[k]!
        changed = true
      }
    }

    if (changed) {
      saveMemos(merged)
      console.log('[keywordMemoStorage] localStorage → S3 マイグレーション完了:', Object.keys(merged).length, '件')
    }
    return merged
  } catch {
    return s3Memos
  }
}
