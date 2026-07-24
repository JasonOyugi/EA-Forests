"use client"

interface LogoProps {
  size?: number
  className?: string
  alt?: string
}

export function Logo({ size = 24, className, alt = "GluCare" }: LogoProps) {
  return (
    <span
      className={`inline-flex items-center justify-center ${className ?? ""}`}
      style={{ width: size, height: size }}
      aria-label={alt}
    >
      {/* Light mode */}
      <img
        src="/glulogo.webp"
        alt={alt}
        width={size}
        height={size}
        className="block dark:hidden object-contain"
        draggable={false}
        loading="eager"
      />

      {/* Dark mode */}
      <img
        src="/glulogo.webp"
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
