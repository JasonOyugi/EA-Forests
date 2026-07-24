import { lazy } from 'react'
import { Navigate } from 'react-router-dom'

const Landing = lazy(() => import('@/app/landing/page'))
const ShopIndex = lazy(() => import("@/app/shop/page"))
const ShopPage = lazy(() => import("@/app/shop/shop-page"))
const ShopProductPage = lazy(() => import("@/app/shop/product-page"))
const NotFound = lazy(() => import('@/app/errors/not-found/page'))

export interface RouteConfig {
  path: string
  element: React.ReactNode
  children?: RouteConfig[]
}

export const routes: RouteConfig[] = [
  {
    path: "/",
    element: <Navigate to="landing" replace />
  },
  {
    path: "/landing",
    element: <Landing />
  },
  {
    path: "/shop",
    element: <ShopIndex />
  },
  {
    path: "/shop/:shopSlug",
    element: <ShopPage />
  },
  {
    path: "/shop/:shopSlug/:productSlug",
    element: <ShopProductPage />
  },
  {
    path: "/errors/not-found",
    element: <NotFound />
  },
  {
    path: "*",
    element: <NotFound />
  }
]
