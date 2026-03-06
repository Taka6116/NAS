import { GoogleGenerativeAI } from '@google/generative-ai'

const TITLE_MARKER = '<<<TITLE>>>'
const BODY_MARKER = '<<<BODY>>>'

const SUPERVISOR_BLOCK = `監修者
株式会社日本提携支援 代表取締役
大野 聡介
過去1,000件超のM&A相談、50件超のアドバイザリー契約、15組超のM&A成約組数を担当。(株)日本M&Aセンターにて、年間最多アドバイザリー契約受賞経験あり。新規提携先の開拓やマネジメント経験を経て、(株)日本提携支援を設立。`

const FOOTER = `導入事例はこちらから
https://nihon-teikei.co.jp/news/casestudy/`

export interface RefinedArticle {
  refinedTitle: string
  refinedContent: string
}

export interface FirstDraftResult {
  title: string
  content: string
}

/** プロンプトと参照データから一次執筆（タイトル＋本文）を生成する */
export async function generateFirstDraftFromPrompt(
  userPrompt: string,
  targetKeyword?: string,
  dataContext?: string
): Promise<FirstDraftResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY が設定されていません')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const kwHint = targetKeyword
    ? `\nターゲットキーワードを意識すること：「${targetKeyword}」`
    : ''

  const dataSection = dataContext?.trim()
    ? `

【参照データ（データページでアップロードした資料）】以下を参照し、この内容を踏まえて記事を作成すること。
---
${dataContext}
---`
    : ''

  const prompt = `あなたはM&A・事業承継・経営支援を専門とする記事ライターです。
ユーザーからの指示（プロンプト）に従い、記事のタイトルと本文を**1本分**作成してください。${dataSection}

【出力形式】以下の2つのマーカーのみを使い、必ずこの順で出力すること。
${TITLE_MARKER}
（記事タイトル・1行のみ）
${BODY_MARKER}
（記事本文）

上記フォーマット以外の文字（説明文など）は一切出力しないこと。

【本文の構成 — 順番通りに出力すること】
1. 監修者ブロック（以下をそのまま1行目から出力）：
${SUPERVISOR_BLOCK}

2. 本文（見出しは「1. 〇〇」「2. 〇〇」のように番号付き。■や●で小見出しも可。事実に基づいた内容にすること。参照データがある場合はその内容を要約・活用すること）

3. フッター（以下をそのまま出力）：
${FOOTER}

【ルール】
- タイトルはSEOを意識した具体的な1行にすること。${kwHint}
- 本文は読者（経営者・事業承継検討者など）に役立つ実用的な内容にすること
- 専門用語は初出時のみ括弧で補足すること
- アスタリスク（* **）・Markdown記法（# ## - など）は使わないこと。プレーンテキストで書くこと

【ユーザーからの指示（プロンプト）】
${userPrompt}`

  const result = await model.generateContent(prompt)
  const raw = result.response.text()

  const text = raw
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')

  const titleIdx = text.indexOf(TITLE_MARKER)
  const bodyIdx = text.indexOf(BODY_MARKER)

  if (titleIdx === -1 || bodyIdx === -1 || bodyIdx <= titleIdx) {
    throw new Error('生成結果の形式が不正です。再度お試しください。')
  }

  const title = text
    .slice(titleIdx + TITLE_MARKER.length, bodyIdx)
    .trim()
    .split('\n')[0]
    .trim()
  const content = text.slice(bodyIdx + BODY_MARKER.length).trim()

  return {
    title: title || '（タイトルなし）',
    content: content || '',
  }
}

export async function refineArticleWithGemini(
  title: string,
  content: string,
  targetKeyword?: string
): Promise<RefinedArticle> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY が設定されていません')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const currentYear = new Date().getFullYear()

  const kwInstruction = targetKeyword
    ? `ターゲットキーワード：「${targetKeyword}」
- タイトルにターゲットキーワードを自然に含めること
- 本文冒頭200文字以内にターゲットキーワードを自然に含めること
- 本文中に2〜4回、文脈に合う形でターゲットキーワードを使用すること`
    : `- タイトルはSEOを意識した具体的で検索されやすい表現にすること`

  const prompt = `あなたはM&A・事業承継専門のSEOライター兼編集者です。
以下の記事のタイトルと本文を改善してください。

【出力形式】
${TITLE_MARKER}
（改善後のタイトル1行のみ）
${BODY_MARKER}
（改善後の本文）

上記フォーマット以外の文字は一切出力しないこと。

【タイトルのルール】
- 1行のみ
${kwInstruction}
- 数字・具体性・読者の疑問を含めると効果的
- 元のタイトルにすでに「〇〇年」「最新版」など年・時期が含まれている場合のみ、その年を**${currentYear}年**に修正すること。元タイトルに年が含まれていない記事に、安易に「${currentYear}年最新版」などを追加しないこと（毎日のように「最新版」が出ると読者の不信感やSEO上の問題につながる）

【本文のルール — 順番通りに出力すること】

1. 監修者ブロック（以下をそのまま出力）：
${SUPERVISOR_BLOCK}

2. 本文

3. フッター（以下をそのまま出力）：
${FOOTER}

【推敲の指示】
- 元の構成・見出し・事実・数字を変えないこと
- 元記事にない情報を追加しないこと
- 文字数は元の±20%以内に収めること
- 各見出しセクションの冒頭1文は「読者の疑問に直接答える」文にすること
  例：「事業承継の相談先は〇〇と〇〇の2種類に大別されます」
- 文末表現を統一しすぎず、リズムに変化をつけること
- 専門用語は初出時のみ括弧内で短く補足すること

【LLMO対応の指示】
- 記事内のサービス・制度・固有名詞は正式名称で表記すること
- 数字・実績・固有の事例は省略せず正確に残すこと
- 「〜とは」で始まる定義文を各セクションに含めること

【禁止事項】
- アスタリスク（* **）の使用禁止
- Markdown記法（# ## ### - など）の使用禁止
- 「推敲しました」などの説明文の出力禁止

【元のタイトル】
${title}

【元の本文】
${content}`

  const result = await model.generateContent(prompt)
  const raw = result.response.text()

  const text = raw
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')

  const titleIdx = text.indexOf(TITLE_MARKER)
  const bodyIdx = text.indexOf(BODY_MARKER)

  if (titleIdx === -1 || bodyIdx === -1 || bodyIdx <= titleIdx) {
    throw new Error('推敲結果の形式が不正です。再度お試しください。')
  }

  const refinedTitle = text
    .slice(titleIdx + TITLE_MARKER.length, bodyIdx)
    .trim()
    .split('\n')[0]
    .trim()
  const refinedContent = text.slice(bodyIdx + BODY_MARKER.length).trim()

  return {
    refinedTitle: refinedTitle || title,
    refinedContent: refinedContent || content,
  }
}
