import { SavedArticle } from './types'

const STORAGE_KEY = 'nas_articles'

export function getAllArticles(): SavedArticle[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function isQuotaExceeded(e: unknown): boolean {
  return e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)
}

export function saveArticle(article: SavedArticle): void {
  if (typeof window === 'undefined') return
  const all = getAllArticles()
  const existingIndex = all.findIndex(a => a.id === article.id)
  if (existingIndex >= 0) {
    all[existingIndex] = article
  } else {
    all.unshift(article)
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch (e) {
    if (isQuotaExceeded(e)) {
      throw new Error(
        'ストレージの容量不足です。画像が大きい可能性があります。不要な記事を一覧から削除してから再度保存してください。'
      )
    }
    throw e
  }
}

export function deleteArticle(id: string): void {
  const all = getAllArticles().filter(a => a.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function getArticleById(id: string): SavedArticle | null {
  return getAllArticles().find(a => a.id === id) ?? null
}

export function updateArticleStatus(
  id: string,
  status: SavedArticle['status'],
  wordpressUrl?: string
): void {
  const all = getAllArticles()
  const article = all.find(a => a.id === id)
  if (article) {
    article.status = status
    if (wordpressUrl) article.wordpressUrl = wordpressUrl
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  }
}
