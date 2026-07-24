import type { ReactNode } from 'react'
import { cn } from "@/lib/utils"

export const CardDecorator = ({
  children,
  className,
  iconClassName,
}: {
  children: ReactNode
  className?: string
  iconClassName?: string
}) => (
  <div className={cn('relative mx-auto h-36 w-36', className)}>
    {/* Light Mode Dot Pattern */}
    <div
      aria-hidden
      className='absolute inset-0 bg-[radial-gradient(circle,var(--color-foreground)_1px,transparent_1px)] bg-[length:16px_16px] opacity-30'
    />
    {/* Light Mode Radial Fade */}
    <div aria-hidden className='to-card absolute inset-0 bg-radial from-transparent' />
    {/* Center Icon Container */}
    <div className={cn('bg-background absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-md border shadow-xs', iconClassName)}>
      {children}
    </div>
  </div>
)
