interface ShopSectionHeaderProps {
    title: string
    description: string
  }
  
  export function ShopSectionHeader({
    title,
    description,
  }: ShopSectionHeaderProps) {
    return (
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    )
  }