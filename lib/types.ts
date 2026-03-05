export type Step = 1 | 2 | 3 | 4

export interface InternalLinkEntry {
  anchorText: string
  url: string
  label?: string
}

export interface ArticleData {
  title: string
  originalContent: string
  refinedContent: string
  refinedTitle: string
  targetKeyword?: string
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
