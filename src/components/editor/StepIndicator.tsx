import { Step } from '@/lib/types'

interface StepIndicatorProps {
  currentStep: Step
  onStepClick?: (step: Step) => void
}

const steps = [
  { number: 1 as Step, label: '一次執筆' },
  { number: 2 as Step, label: 'AI推敲' },
  { number: 3 as Step, label: '画像生成' },
  { number: 4 as Step, label: 'プレビュー' },
  { number: 5 as Step, label: '投稿' },
]

export default function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div
      className="flex flex-col rounded-[14px] px-3 py-4"
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.number
        const isActive    = currentStep === step.number
        const isNext      = step.number === currentStep + 1
        const isClickable = typeof onStepClick === 'function'
        const isLast      = index === steps.length - 1

        const content = (
          <>
            {/* Icon + connector column */}
            <div className="flex flex-col items-center w-7 flex-shrink-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-150"
                style={
                  isCompleted
                    ? {
                        background: 'linear-gradient(135deg, #1267f2 0%, #18a9e6 100%)',
                        color: '#fff',
                        boxShadow: '0 2px 8px rgba(18,103,242,0.28)',
                      }
                    : isActive
                      ? {
                          background: 'var(--primary)',
                          color: '#fff',
                          boxShadow: '0 0 0 3px rgba(18,103,242,0.18)',
                        }
                      : isNext
                        ? {
                            background: 'rgba(18,103,242,0.08)',
                            color: 'var(--primary)',
                            border: '1.5px dashed rgba(18,103,242,0.30)',
                          }
                        : {
                            background: 'rgba(20,44,92,0.06)',
                            color: 'var(--text-faint)',
                            border: '1px solid var(--border)',
                          }
                }
              >
                {isCompleted ? (
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden>
                    <path d="M1.5 5L4.5 8L10.5 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="font-mono text-[11px]">{step.number}</span>
                )}
              </div>
              {!isLast && (
                <div
                  className="w-[2px] h-8 mt-0.5 transition-all duration-200"
                  style={{
                    background: isCompleted
                      ? 'linear-gradient(to bottom, rgba(18,103,242,0.40), rgba(18,103,242,0.12))'
                      : 'rgba(20,44,92,0.08)',
                  }}
                />
              )}
            </div>

            {/* Label */}
            <span
              className="text-xs whitespace-nowrap transition-colors duration-150"
              style={{
                fontWeight: isActive ? 700 : isCompleted ? 600 : 400,
                color: isActive
                  ? 'var(--primary)'
                  : isCompleted
                    ? 'var(--primary)'
                    : isNext
                      ? 'var(--text-muted)'
                      : 'var(--text-faint)',
              }}
            >
              {step.label}
            </span>
          </>
        )

        const rowStyle = `
          flex items-center gap-2.5 py-1.5 px-1 rounded-[8px]
          ${isClickable ? 'hover:bg-[rgba(18,103,242,0.05)] active:bg-[rgba(18,103,242,0.09)] transition-colors cursor-pointer' : ''}
        `

        return (
          <div key={step.number}>
            {isClickable ? (
              <button
                type="button"
                onClick={() => onStepClick(step.number)}
                className={rowStyle}
                aria-label={`${step.label}へ移動`}
              >
                {content}
              </button>
            ) : (
              <div className={rowStyle}>{content}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
