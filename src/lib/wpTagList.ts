/** WordPress REST /wp/v2/tags の一覧用（クライアント・API 共通） */
export interface WpTagListItem {
  id: number
  name: string
  slug: string
  count?: number
}
