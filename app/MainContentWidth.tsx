'use client'

import { usePathname } from 'next/navigation'

export default function MainContentWidth({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isPreview = pathname === '/preview'
  return (
    <div
      className={`w-full ${isPreview ? 'max-w-[1600px]' : 'max-w-[1000px]'}`}
    >
      {children}
    </div>
  )
}
