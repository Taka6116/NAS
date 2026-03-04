export type Step = 1 | 2 | 3 | 4

/** 内部リンク1件（記事内のどの文言にどのURLを張るか） */
export interface InternalLinkEntry {
  /** 記事内のリンクを張る文言（アンカーテキスト） */
  anchorText: string
  /** リンク先URL */
  url: string
  /** 管理用ラベル（例: お役立ち情報のタイトル） */
  label?: string
}

export interface ArticleData {
  title: string
  originalContent: string
  refinedContent: string
  /** Gemini推敲後のタイトル（未推敲時は空） */
  refinedTitle: string
  /** 追加する内部リンク（担当者が設定） */
  internalLinks: InternalLinkEntry[]
  imageUrl: string
  wordpressUrl?: string
}

export type ProcessingState = 'idle' | 'loading' | 'success' | 'error'

export interface StepState {
  currentStep: Step
  article: ArticleData
  geminiStatus: ProcessingState
  fireflyStatus: ProcessingState
  wordpressStatus: ProcessingState
}
