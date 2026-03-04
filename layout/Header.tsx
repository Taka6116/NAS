import { Step } from '@/lib/types'

interface HeaderProps {
  currentStep: Step
}

export default function Header({ currentStep }: HeaderProps) {
  return (
    <header className="h-14 bg-[#1B2A4A] flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <span className="text-white text-xl font-bold tracking-wide">NAS</span>
        <span className="text-[#94A3B8] text-xs font-mono">NTS Article System</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[#64748B] text-xs font-mono">STEP</span>
        <span className="text-white text-sm font-mono font-medium">
          {currentStep} <span className="text-[#64748B]">/</span> 4
        </span>
      </div>
    </header>
  )
}
