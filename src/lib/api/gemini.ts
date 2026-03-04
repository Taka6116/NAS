import { GoogleGenerativeAI } from '@google/generative-ai'

const TITLE_MARKER = '<<<TITLE>>>'
const BODY_MARKER = '<<<BODY>>>'

export interface RefinedArticle {
  refinedTitle: string
  refinedContent: string
}

export async function refineArticleWithGemini(
  title: string,
  content: string
): Promise<RefinedArticle> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY が設定されていません')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `以下の記事の「タイトル」と「本文」の両方を、読みやすく、SEOに強く、LLMOにも対応した内容に改善してください。説得力のある文章でかつ日本提携支援の独自性が含まれた内容にしてください。
元の意図・内容・構成は保持しつつ、AI感ないけれども質が高くなるように洗練させてください。

出力形式は必ず次のとおりにしてください（説明や前置きは一切不要）:
${TITLE_MARKER}
（ここに改善後のタイトル1行のみ）
${BODY_MARKER}
（ここに改善後の記事本文）

ルール:
- タイトルは1行で、キャッチーでSEOを意識したものにすること。
- 本文はSEOの観点から自然なキーワードの使用を意識すること。
- 元の文字数から大幅に変えないこと（±20%以内）。
- "監修者
株式会社日本提携支援 代表取締役
大野 聡介
過去1,000件超のM&A相談、50件超のアドバイザリー契約、15組超のM&A成約組数を担当。(株)日本M&Aセンターにて、年間最多アドバイザリー契約受賞経験あり。新規提携先の開拓やマネジメント経験を経て、(株)日本提携支援を設立。"
は必ず内容の頭に含めてください。
- 精査しアウトプットした記事にはAI特有の「**」は禁止。「#### 」も禁止。「*   **」「*」（アスタリスク）の使用も一切禁止。マークダウン記法（箇条書きの「*」「-」「#」など）は全て使用禁止。
- コンテンツの最後に必ず「導入事例はこちらから」という文言にハイパーリンクで "https://nihon-teikei.co.jp/news/casestudy/" を設けてください。

---
【元のタイトル】
${title}

【元の本文】
${content}
---`

  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text()

  const titleIdx = text.indexOf(TITLE_MARKER)
  const bodyIdx = text.indexOf(BODY_MARKER)
  if (titleIdx === -1 || bodyIdx === -1 || bodyIdx <= titleIdx) {
    throw new Error('推敲結果の形式が不正です。再度お試しください。')
  }
  const refinedTitle = text
    .slice(titleIdx + TITLE_MARKER.length, bodyIdx)
    .replace(/^\s+|\s+$/g, '')
    .split('\n')[0]
    .trim()
  const refinedContent = text
    .slice(bodyIdx + BODY_MARKER.length)
    .replace(/^\s+|\s+$/g, '')

  return { refinedTitle: refinedTitle || title, refinedContent: refinedContent || content }
}
