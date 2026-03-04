export type Step = 1 | 2 | 3 | 4

export interface ArticleData {
  title: string
  originalContent: string
  refinedContent: string
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
