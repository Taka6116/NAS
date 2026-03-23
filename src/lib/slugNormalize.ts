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
