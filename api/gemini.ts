// TODO: Gemini APIキーを環境変数 GEMINI_API_KEY に設定すること
export async function refineArticleWithGemini(content: string): Promise<string> {
  // TODO: 実装予定
  // Gemini APIを呼び出し、記事を改善して返す
  await new Promise(resolve => setTimeout(resolve, 2000)) // ダミーの待機
  return content + '\n\n（Geminiによる改善済み — APIを実装してください）'
}
