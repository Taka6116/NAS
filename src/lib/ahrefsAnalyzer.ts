import type { AhrefsKeywordRow } from './ahrefsCsvParser'
import { ahrefsCategoryDisplayJa } from './ahrefsCategoryJa'

export type PriorityLevel = 3 | 2 | 1 | 0

export interface ScoredKeyword extends AhrefsKeywordRow {
  score: number
  priority: PriorityLevel
  trend: 'up' | 'down' | 'stable'
  trendPercent: number
  detectedCategory: string
}

// ---------- NTS（日本提携支援）向けカテゴリ定義 ----------

const CATEGORIES: { category: string; patterns: string[] }[] = [
  {
    category: 'M&A全般',
    patterns: ['m&a', 'エムアンドエー', 'エムアンド', '合併', '買収', '売却', '譲渡', '譲受', 'ディール'],
  },
  {
    category: '事業承継',
    patterns: ['事業承継', '後継者', '承継', '跡継ぎ', '代替わり', '世代交代', '親族内承継', '親族外承継'],
  },
  {
    category: '企業価値評価',
    patterns: ['企業価値', 'バリュエーション', 'デューデリジェンス', 'dd', '企業評価', '株価算定', '事業価値'],
  },
  {
    category: 'PMI・統合',
    patterns: ['pmi', '統合', '磨き上げ', 'ポストマージャー', 'シナジー', '経営統合'],
  },
  {
    category: 'アドバイザー・仲介',
    patterns: ['アドバイザー', '仲介', 'fa', 'ファイナンシャルアドバイザー', '専門家', 'コンサルタント', '相談', '相談先'],
  },
  {
    category: '資金調達・補助金',
    patterns: ['資金調達', '融資', '補助金', '助成金', '経営力向上', '事業再構築', '資金繰り'],
  },
  {
    category: '中小企業経営',
    patterns: ['中小企業', 'sme', '小規模事業', '零細', '経営改善', '経営戦略', '収益改善', '事業計画'],
  },
  {
    category: '法務・税務',
    patterns: ['法務', '税務', '契約', '税金', '会計', '登記', '届出', '許認可', 'コンプライアンス'],
  },
]

function detectCategory(keyword: string): string {
  const lower = keyword.toLowerCase()
  for (const { category, patterns } of CATEGORIES) {
    for (const p of patterns) {
      if (lower.includes(p.toLowerCase())) return category
    }
  }
  return 'その他'
}

/** Ahrefs Category 列を日本語化し、空ならキーワードから推定 */
function resolvedDetectedCategory(csvCategory: string | undefined, keyword: string): string {
  const csv = csvCategory?.trim() ?? ''
  if (csv) {
    const ja = ahrefsCategoryDisplayJa(csv)
    if (ja) return ja
  }
  return detectCategory(keyword)
}

// ---------- Opportunity Score ----------

function calcOpportunityScore(row: AhrefsKeywordRow): number {
  const volScore = Math.min(row.volume / 1000, 10)
  const kdScore = (100 - row.kd) / 10
  const cpcBonus = Math.min(row.cpc / 500, 2)
  return Math.round((volScore * 4 + kdScore * 5 + cpcBonus * 1) * 10) / 10
}

// ---------- Trend detection ----------

function detectSvTrend(svTrend: number[]): { trend: 'up' | 'down' | 'stable'; changePercent: number } {
  if (svTrend.length < 4) return { trend: 'stable', changePercent: 0 }

  const mid = Math.floor(svTrend.length / 2)
  const recent = svTrend.slice(mid)
  const earlier = svTrend.slice(0, mid)

  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length
  const avgEarlier = earlier.reduce((a, b) => a + b, 0) / earlier.length

  if (avgEarlier === 0) return { trend: avgRecent > 0 ? 'up' : 'stable', changePercent: 0 }

  const changePercent = Math.round(((avgRecent - avgEarlier) / avgEarlier) * 100)

  if (changePercent >= 10) return { trend: 'up', changePercent }
  if (changePercent <= -10) return { trend: 'down', changePercent }
  return { trend: 'stable', changePercent }
}

// ---------- Priority ----------

function calcPriority(
  score: number, kd: number, volume: number,
  trend: 'up' | 'down' | 'stable',
): PriorityLevel {
  if (score >= 50 && kd <= 30 && volume >= 100) return 3
  if (score >= 40 && kd <= 30 && trend === 'up') return 3
  if (score >= 40 && kd <= 50) return 2
  if (kd <= 20 && volume >= 100) return 2
  if (score >= 20) return 1
  return 0
}

// ---------- Site Explorer オーガニック（競合KW）向け。KD はスコア・優先度に使わない ----------

/**
 * Site Explorer「オーガニックキーワード」向けの施策スコア。KD は含めない。
 */
export function calculateOrganicActionScore(row: AhrefsKeywordRow): number {
  const pos = row.position
  const tc = row.trafficChange
  const vol = row.volume

  let s = 0
  if (pos != null && pos >= 1) {
    if (pos <= 3) s += 20
    else if (pos <= 10) s += 40
    else if (pos <= 20) s += 32
    else if (pos <= 50) s += 18
    else s += 8
  } else {
    s += 5
  }

  if (tc != null) {
    if (tc <= -500) s += 45
    else if (tc <= -200) s += 35
    else if (tc <= -50) s += 22
    else if (tc < 0) s += 10
    else if (tc > 0) s += Math.min(tc / 50, 15)
  }

  s += Math.min(vol / 400, 22)
  return Math.round(Math.min(s, 99) * 10) / 10
}

/**
 * 競合KW向け優先度（順位・流入変動・ボリューム・SVトレンド）。KD は使わない。
 */
export function calcPriorityOrganic(
  row: AhrefsKeywordRow,
  trend: 'up' | 'down' | 'stable',
): PriorityLevel {
  const vol = row.volume
  const pos = row.position
  const tc = row.trafficChange

  const strongDecline = tc != null && tc <= -150 && vol >= 200
  const top3Erode = pos != null && pos <= 3 && tc != null && tc <= -30 && vol >= 100
  const strikeZone = pos != null && pos >= 4 && pos <= 10
  const almostPage1 = pos != null && pos >= 11 && pos <= 20
  const highVolStrike = strikeZone && vol >= 400
  const highVolAlmost = almostPage1 && vol >= 1200
  const veryHighVolMid = strikeZone && vol >= 2500

  if (strongDecline || top3Erode || highVolStrike || highVolAlmost || veryHighVolMid) return 3

  const moderateDecline = tc != null && tc <= -40 && vol >= 150
  const strikeOk = strikeZone && vol >= 150
  const almostOk = almostPage1 && vol >= 400
  const topStable = pos != null && pos <= 3 && vol >= 200
  const trendUpMid = trend === 'up' && vol >= 800 && pos != null && pos <= 30

  if (moderateDecline || strikeOk || almostOk || topStable || trendUpMid) return 2

  if (vol >= 300 && pos != null && pos <= 30) return 1
  if (vol >= 800) return 1
  if (tc != null && tc < 0 && vol >= 80) return 1

  return 0
}

export function analyzeOrganicKeywords(keywords: AhrefsKeywordRow[], excludeBranded = true): ScoredKeyword[] {
  let filtered = keywords
  if (excludeBranded) {
    filtered = keywords.filter(kw => !kw.branded)
  }
  return filtered
    .map(row => {
      const score = calculateOrganicActionScore(row)
      const { trend, changePercent } = detectSvTrend(row.svTrend)
      const priority = calcPriorityOrganic(row, trend)
      const detectedCategory = resolvedDetectedCategory(row.category, row.keyword)
      return { ...row, score, priority, trend, trendPercent: changePercent, detectedCategory }
    })
    .sort((a, b) => b.priority - a.priority || b.score - a.score)
}

// ---------- Export functions ----------

export function analyzeKeywords(keywords: AhrefsKeywordRow[]): ScoredKeyword[] {
  return keywords
    .map(row => {
      const { trend, changePercent } = detectSvTrend(row.svTrend)
      const score = calcOpportunityScore(row)
      const priority = calcPriority(score, row.kd, row.volume, trend)
      const detectedCategory = resolvedDetectedCategory(row.category, row.keyword)
      return { ...row, score, priority, trend, trendPercent: changePercent, detectedCategory }
    })
    .sort((a, b) => b.priority - a.priority || b.score - a.score)
}

export function detectTrends(keywords: AhrefsKeywordRow[]): ScoredKeyword[] {
  const scored = analyzeKeywords(keywords)
  return scored.filter(k => k.trend !== 'stable')
}

export function getCategoryCounts(scored: ScoredKeyword[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const k of scored) {
    const cat = k.detectedCategory || 'その他'
    counts[cat] = (counts[cat] || 0) + 1
  }
  return counts
}

export function mergeAndAnalyze(datasetsKeywords: AhrefsKeywordRow[][]): ScoredKeyword[] {
  const merged = datasetsKeywords.flat()
  const seen = new Map<string, AhrefsKeywordRow>()
  for (const row of merged) {
    const key = row.keyword.toLowerCase().trim()
    const existing = seen.get(key)
    if (!existing || row.volume > existing.volume) {
      seen.set(key, row)
    }
  }
  return analyzeKeywords([...seen.values()])
}

export function mergeAndAnalyzeOrganic(datasetsKeywords: AhrefsKeywordRow[][]): ScoredKeyword[] {
  const merged = datasetsKeywords.flat()
  const seen = new Map<string, AhrefsKeywordRow>()
  for (const row of merged) {
    const key = row.keyword.toLowerCase().trim()
    const existing = seen.get(key)
    if (!existing || row.volume > existing.volume) {
      seen.set(key, row)
    }
  }
  return analyzeOrganicKeywords([...seen.values()])
}
