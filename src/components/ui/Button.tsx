'use client'

import { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'ghost' | 'navy'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  loading?: boolean
}

const gradientBase: CSSProperties = {
  background: 'linear-gradient(135deg, #0055ff 0%, #00b4ff 100%)',
  border: 'none',
  boxShadow: '0 4px 15px rgba(0,85,255,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
}

const navyGradientBase: CSSProperties = {
  background: 'linear-gradient(135deg, #001250 0%, #002C93 60%, #0047C8 100%)',
  border: 'none',
  boxShadow: '0 4px 14px rgba(0,44,147,0.40), inset 0 1px 0 rgba(255,255,255,0.15)',
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'text-white hover:brightness-110 active:brightness-95 active:scale-[0.98]',
  ghost: 'bg-transparent text-[#1B2A4A] border border-[#E2E8F0] hover:bg-[#F5F7FA] hover:border-[#1B2A4A]',
  navy: 'text-white hover:brightness-110 active:brightness-95 active:scale-[0.98]',
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  disabled,
  className = '',
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  const inlineStyle: CSSProperties =
    variant === 'primary'
      ? gradientBase
      : variant === 'navy'
        ? navyGradientBase
        : {}

  return (
    <button
      {...props}
      disabled={isDisabled}
      style={{ ...inlineStyle, ...style }}
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold rounded-lg
        transition-all duration-150
        cursor-pointer select-none
        ${variantClasses[variant]}
        ${sizeStyles[size]}
        ${isDisabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}
        ${className}
      `}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}
