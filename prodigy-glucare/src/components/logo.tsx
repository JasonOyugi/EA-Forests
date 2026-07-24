"use client"

interface LogoProps {
  size?: number
  className?: string
  alt?: string
}

export function Logo({ size = 24, className, alt = "Prodigy GluCare" }: LogoProps) {
  return (
    <span
      className={`inline-flex items-center justify-center ${className ?? ""}`}
      style={{ width: size, height: size }}
      aria-label={alt}
    >
      {/* Light mode */}
      <img
        src="/dolphin1.png"
        alt={alt}
        width={size}
        height={size}
        className="block dark:hidden object-contain"
        draggable={false}
        loading="eager"
      />

      {/* Dark mode */}
      <img
        src="/dolphin1 dark.png"
        alt={alt}
        width={size}
        height={size}
        className="hidden dark:block object-contain"
        draggable={false}
        loading="eager"
      />
    </span>
  )
}
