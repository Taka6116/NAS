import { Step } from '@/lib/types'

interface StepIndicatorProps {
  currentStep: Step
}

const steps = [
  { number: 1 as Step, label: '一次執筆' },
  { number: 2 as Step, label: 'Gemini推敲' },
  { number: 3 as Step, label: '画像生成' },
  { number: 4 as Step, label: '投稿' },
]

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center w-full">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.number
        const isActive = currentStep === step.number
        const isLast = index === steps.length - 1

        return (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                  ${isCompleted ? 'bg-[#1B2A4A] text-white' : ''}
                  ${isActive ? 'bg-[#C0392B] text-white ring-4 ring-[#C0392B]/20' : ''}
                  ${!isCompleted && !isActive ? 'bg-[#E2E8F0] text-[#64748B]' : ''}
                `}
              >
                {isCompleted ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M2 7L5.5 10.5L12 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span className="font-mono text-xs">{step.number}</span>
                )}
              </div>
              <span
                className={`
                  text-xs font-medium whitespace-nowrap
                  ${isActive ? 'text-[#C0392B] font-semibold' : ''}
                  ${isCompleted ? 'text-[#1B2A4A]' : ''}
                  ${!isCompleted && !isActive ? 'text-[#64748B]' : ''}
                `}
              >
                {step.label}
              </span>
            </div>

            {!isLast && (
              <div
                className={`
                  flex-1 h-0.5 mx-2 mb-5 transition-all
                  ${isCompleted ? 'bg-[#1B2A4A]' : 'bg-[#E2E8F0]'}
                `}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
