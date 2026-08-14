import { Link } from "react-router-dom"
import { Menu, Search } from "lucide-react"

import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

const links = [
  { label: "Briefing", href: "/newsletter" },
  { label: "Articles", href: "/articles" },
  { label: "Markets", href: "/shop/roundwood" },
  { label: "Tools", href: "/models" },
  { label: "Projects", href: "/shop/forests-land" },
] as const

export function EditorialHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link to="/landing" className="flex shrink-0 items-center gap-2"><Logo size={28} /><span className="font-bold">EA Forests</span></Link>
        <nav className="hidden flex-1 items-center justify-center gap-7 lg:flex">
          {links.map((link) => <Link key={link.label} to={link.href} className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">{link.label}</Link>)}
        </nav>
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <Button variant="ghost" size="icon" asChild><Link to="/articles" aria-label="Search articles"><Search className="size-4" /></Link></Button>
          <ModeToggle variant="ghost" />
          <Button asChild><a href="/newsletter#subscribe">Subscribe</a></Button>
        </div>
        <Sheet>
          <SheetTrigger asChild className="ml-auto lg:hidden"><Button variant="ghost" size="icon"><Menu className="size-5" /></Button></SheetTrigger>
          <SheetContent side="right" className="p-6">
            <SheetHeader><SheetTitle>EA Forests</SheetTitle></SheetHeader>
            <nav className="mt-8 grid gap-2">{links.map((link) => <Link key={link.label} to={link.href} className="border-b py-3 font-semibold">{link.label}</Link>)}</nav>
            <Button className="mt-6 w-full" asChild><a href="/newsletter#subscribe">Subscribe</a></Button>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
