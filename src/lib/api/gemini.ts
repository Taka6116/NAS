import { GoogleGenerativeAI } from '@google/generative-ai'

export async function refineArticleWithGemini(content: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY が設定されていません')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `以下の記事を、読みやすく、SEOに強く、説得力のある文章に改善してください。
元の記事の意図・内容・構成は保持しつつ、表現を洗練させてください。
改善後の記事本文のみを出力し、説明や前置きは不要です。

---
${content}
---`

  const result = await model.generateContent(prompt)
  const response = await result.response
  return response.text()
}
