import type { AhrefsKeywordRow } from './ahrefsCsvParser'

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

// ---------- Export functions ----------

export function analyzeKeywords(keywords: AhrefsKeywordRow[]): ScoredKeyword[] {
  return keywords
    .map(row => {
      const { trend, changePercent } = detectSvTrend(row.svTrend)
      const score = calcOpportunityScore(row)
      const priority = calcPriority(score, row.kd, row.volume, trend)
      const detectedCategory = row.category || detectCategory(row.keyword)
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
