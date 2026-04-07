import { cn } from "@/lib/utils"
import type { ShopCategory, ShopDomain } from "@/app/shop/types"

interface CategoryNavProps {
  categories: ShopCategory[]
  activeDomain: ShopDomain | "all"
  onChange: (domain: ShopDomain | "all") => void
}

export function CategoryNav({
  categories,
  activeDomain,
  onChange,
}: CategoryNavProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={cn(
          "rounded-full border px-4 py-2 text-sm transition-colors",
          activeDomain === "all"
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background hover:bg-accent"
        )}
      >
        All
      </button>

      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onChange(category.id)}
          className={cn(
            "rounded-full border px-4 py-2 text-sm transition-colors",
            activeDomain === category.id
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background hover:bg-accent"
          )}
        >
          {category.name}
        </button>
      ))}
    </div>
  )
}