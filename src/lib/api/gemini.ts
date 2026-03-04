import { GoogleGenerativeAI } from '@google/generative-ai'

export async function refineArticleWithGemini(content: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY が設定されていません')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `以下の記事を、読みやすく、SEOに強く、LLMOにも対応した内容にしてください。説得力のある文章でかつ日本提携支援の独自性が含まれた内容に改善してください。
元の記事の意図・内容・構成は保持しつつ、AI感ないけれども質が高くなるように洗練させてください。
改善後の記事本文のみを出力し、説明や前置きは不要です。
SEOの観点から自然なキーワードの使用を意識すること。
元の文字数から大幅に変えないこと（±20%以内）。
"監修者
株式会社日本提携支援 代表取締役
大野 聡介
過去1,000件超のM&A相談、50件超のアドバイザリー契約、15組超のM&A成約組数を担当。(株)日本M&Aセンターにて、年間最多アドバイザリー契約受賞経験あり。新規提携先の開拓やマネジメント経験を経て、(株)日本提携支援を設立。"
は必ず内容の頭に含めてください。　精査しアウトプットした記事にはAI特有の「**」は禁止とします。　「#### 」も禁止とします。「*   **」は一切の使用を禁じます。
コンテンツの最後に必ず「導入事例はこちらから」という文言にハイパーリンクで　"https://nihon-teikei.co.jp/news/casestudy/"を設けてください。
---
${content}
---`

  const result = await model.generateContent(prompt)
  const response = await result.response
  return response.text()
}
