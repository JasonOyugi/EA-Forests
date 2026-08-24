interface ShopSectionHeaderProps {
    title: string
    description: string
  }
  
  export function ShopSectionHeader({
    title,
    description,
  }: ShopSectionHeaderProps) {
    return (
      <div className="flex flex-col gap-3">
        <h3 className="type-section-title">{title}</h3>
        <p className="type-body-copy max-w-3xl text-muted-foreground">{description}</p>
      </div>
    )
  }
