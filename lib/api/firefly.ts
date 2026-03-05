// TODO: Adobe Firefly APIキーを環境変数 FIREFLY_API_KEY に設定すること
export async function generateImageWithFirefly(title: string, content: string): Promise<string> {
  // TODO: 実装予定
  // 記事タイトルと本文からプロンプトを生成してFirefly APIを呼び出す
  await new Promise(resolve => setTimeout(resolve, 2000)) // ダミーの待機
  return 'https://placehold.co/1000x525/1B2A4A/FFFFFF?text=Firefly+Generated+Image'
}
