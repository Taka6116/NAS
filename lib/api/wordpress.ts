// TODO: WordPress URLとAPIキーを環境変数に設定すること
// WP_URL, WP_USERNAME, WP_APP_PASSWORD
export async function publishToWordPress(
  title: string,
  content: string,
  imageUrl: string
): Promise<string> {
  // TODO: 実装予定
  // WordPress REST APIで記事を投稿する
  await new Promise(resolve => setTimeout(resolve, 2000)) // ダミーの待機
  return 'https://example.com/wp/sample-post-url'
}
