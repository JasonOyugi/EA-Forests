import { useEffect } from "react"
import { useLocation } from "react-router-dom"

const siteUrl = (import.meta.env.VITE_PUBLIC_SITE_URL || "https://ea-forests-public.vercel.app").replace(/\/$/, "")

function routeMetadata(pathname: string) {
  if (pathname.startsWith("/shop/seedlings")) {
    return {
      title: "Seeds & Seedlings Market | EA Forests",
      description: "Compare forestry seeds, seedlings, suppliers, availability, and source evidence across East Africa.",
    }
  }
  if (pathname.startsWith("/shop/wood-markets-map")) {
    return {
      title: "Wood Markets Map | EA Forests",
      description: "Explore East African wood processors, buyer specifications, market locations, and roundwood pricing.",
    }
  }
  if (pathname.startsWith("/shop/forests-land")) {
    return {
      title: "Forestry Land & Services | EA Forests",
      description: "Review forestry land, managed forest opportunities, and field services across East Africa.",
    }
  }
  if (pathname.startsWith("/shop")) {
    return {
      title: "Forestry Markets | EA Forests",
      description: "Explore forestry planting material, land, services, processors, and market intelligence in East Africa.",
    }
  }
  if (pathname.startsWith("/models")) {
    return {
      title: "Forestry Models | EA Forests",
      description: "Explore practical forestry site, production, nursery, and commercial analysis tools for East Africa.",
    }
  }
  if (pathname !== "/" && pathname !== "/landing") {
    return {
      title: "Page Not Found | EA Forests",
      description: "The requested EA Forests public page could not be found.",
    }
  }
  return {
    title: "EA Forests | Forestry Markets & Intelligence",
    description: "EA Forests connects forestry markets, planting material, investment opportunities, and practical intelligence across East Africa.",
  }
}

function setMeta(selector: string, content: string) {
  document.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", content)
}

export function PublicMetadata() {
  const { pathname } = useLocation()

  useEffect(() => {
    const metadata = routeMetadata(pathname)
    const canonicalUrl = `${siteUrl}${pathname === "/landing" ? "/" : pathname}`
    document.title = metadata.title
    setMeta('meta[name="description"]', metadata.description)
    setMeta('meta[property="og:title"]', metadata.title)
    setMeta('meta[property="og:description"]', metadata.description)
    setMeta('meta[property="og:url"]', canonicalUrl)
    setMeta('meta[name="twitter:title"]', metadata.title)
    setMeta('meta[name="twitter:description"]', metadata.description)
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute("href", canonicalUrl)
  }, [pathname])

  return null
}