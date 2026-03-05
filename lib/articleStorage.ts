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

export function saveArticle(article: SavedArticle): void {
  const all = getAllArticles()
  const existingIndex = all.findIndex(a => a.id === article.id)
  if (existingIndex >= 0) {
    all[existingIndex] = article
  } else {
    all.unshift(article)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
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
