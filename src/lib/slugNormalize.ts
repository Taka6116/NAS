const SLUG_PREFIX = 'ma-advisor-'

/**
 * スラッグ内の「m-a」（M&A の誤分割）を「ma」にまとめる。
 * 例: m-a-advisor-selection → ma-advisor-selection、sme-m-a-tips → sme-ma-tips
 */
export function normalizeMaInSlug(slug: string): string {
  let prev = slug
  let next = slug.replace(/(^|-)m-a(?=-|$)/g, '$1ma')
  while (next !== prev) {
    prev = next
    next = prev.replace(/(^|-)m-a(?=-|$)/g, '$1ma')
  }
  return next
}

/** Gemini / WordPress 投稿用: API 未取得時・空スラッグ時の日付ベース英語スラッグ */
export function maAdvisorDateFallbackSlug(): string {
  const d = new Date()
  const tail = `article-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return normalizeMaInSlug(`${SLUG_PREFIX}${tail}`)
}

/**
 * REST・JSON-LD 用の最終スラッグ（英字・数字・ハイフンのみ、常に ma-advisor- で開始）。
 * 空・不正・サフィックス短すぎは日付フォールバック。
 */
export function resolveCanonicalPostSlug(raw: string | undefined | null): string {
  let s = (raw ?? '').trim().toLowerCase()
  s = s.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
  if (!s) return maAdvisorDateFallbackSlug()

  if (s.startsWith(SLUG_PREFIX)) {
    // そのまま
  } else if (s.startsWith('ma-advisor')) {
    s = SLUG_PREFIX + s.slice('ma-advisor'.length).replace(/^-+/, '')
  } else {
    s = SLUG_PREFIX + s.replace(/^-+/, '')
  }
  s = normalizeMaInSlug(s)
  const after = s.startsWith(SLUG_PREFIX) ? s.slice(SLUG_PREFIX.length) : ''
  if (after.length < 3) return maAdvisorDateFallbackSlug()
  return s
}
