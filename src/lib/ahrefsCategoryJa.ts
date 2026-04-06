/**
 * Ahrefs CSV の Category 列（英語）を UI 表示用に日本語化する。
 * 複数カテゴリは「;」区切りの想定（例: Investment banking; Management）。
 */

const EN_TO_JA: Record<string, string> = {
  'investment banking': '投資銀行',
  management: '経営・マネジメント',
  'business finance': '企業金融',
  auditing: '監査',
  risk: 'リスク管理',
  'business formation': '事業設立',
  business: 'ビジネス',
  planning: '計画・企画',
  consulting: 'コンサルティング',
  human: '人事・人材',
  'small business': '中小企業',
  'government grants': '政府助成金・補助金',
  marketing: 'マーケティング',
  sales: '営業',
  finance: '財務',
  accounting: '会計',
  legal: '法務',
  technology: 'テクノロジー',
  it: 'IT',
  software: 'ソフトウェア',
  healthcare: 'ヘルスケア',
  education: '教育',
  retail: '小売',
  manufacturing: '製造業',
  'real estate': '不動産',
  insurance: '保険',
  banking: '銀行',
  'private equity': 'プライベートエクイティ',
  venture: 'ベンチャー',
  'venture capital': 'ベンチャーキャピタル',
  mergers: '合併・買収',
  acquisitions: '買収',
  'mergers and acquisitions': 'M&A',
  taxation: '税務',
  compliance: 'コンプライアンス',
  operations: 'オペレーション',
  strategy: '戦略',
  leadership: 'リーダーシップ',
  hr: '人事',
  recruitment: '採用',
  training: '研修',
  development: '開発',
  research: 'リサーチ',
  analytics: '分析',
  ecommerce: 'EC',
  advertising: '広告',
  media: 'メディア',
  design: 'デザイン',
  engineering: 'エンジニアリング',
  sustainability: 'サステナビリティ',
  esg: 'ESG',
  cybersecurity: 'サイバーセキュリティ',
  data: 'データ',
  cloud: 'クラウド',
  ai: 'AI',
  'artificial intelligence': '人工知能',
  blockchain: 'ブロックチェーン',
  fintech: 'フィンテック',
  payments: '決済',
  trading: 'トレーディング',
  wealth: '資産運用',
  'wealth management': '資産管理',
  'asset management': 'アセットマネジメント',
  'corporate finance': 'コーポレートファイナンス',
  lending: '貸付',
  credit: '与信',
  treasury: 'トレジャリー',
  procurement: '調達',
  supply: 'サプライ',
  logistics: '物流',
}

function translateSegment(seg: string): string {
  const k = seg.trim().toLowerCase()
  if (!k) return ''
  return EN_TO_JA[k] ?? seg.trim()
}

/** Category 列の生文字列を日本語ラベルに（未登録は原文のまま） */
export function ahrefsCategoryDisplayJa(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const parts = trimmed.split(/\s*;\s*|\s*,\s*/).map(s => s.trim()).filter(Boolean)
  if (parts.length === 0) return ''
  return parts.map(translateSegment).join('・')
}
