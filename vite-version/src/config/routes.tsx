import { lazy } from 'react'
import { Navigate } from 'react-router-dom'

const Landing = lazy(() => import('@/app/landing/page'))
const ShopIndex = lazy(() => import("@/app/shop/page"))
const ShopPage = lazy(() => import("@/app/shop/shop-page"))
const ShopProductPage = lazy(() => import("@/app/shop/product-page"))
const Models = lazy(() => import('@/app/models/page'))
const SiteSpeciesAnalysis = lazy(() => import('@/app/models/site-species-analysis/page'))
const Model2 = lazy(() => import('@/app/models/model-2/page'))
const Model3 = lazy(() => import('@/app/models/model-3/page'))
const ClonalEucalyptusNursery = lazy(() => import('@/app/models/clonal-eucalyptus-nursery/page'))
const ModelComingSoon = lazy(() => import('@/app/models/coming-soon/page'))
const NotFound = lazy(() => import('@/app/errors/not-found/page'))

export interface RouteConfig {
  path: string
  element: React.ReactNode
  children?: RouteConfig[]
}

export const routes: RouteConfig[] = [
  {
    path: "/",
    element: <Navigate to="/landing" replace />
  },
  {
    path: "/landing",
    element: <Landing />
  },
  {
    path: "/newsletter",
    element: <Navigate to="/landing" replace />
  },
  {
    path: "/articles",
    element: <Navigate to="/models" replace />
  },
  {
    path: "/articles/:articleSlug",
    element: <Navigate to="/models" replace />
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
    path: "/models",
    element: <Models />
  },
  {
    path: "/models/site-classification",
    element: <Navigate to="/models/site-species-analysis" replace />
  },
  {
    path: "/models/site-species-analysis",
    element: <SiteSpeciesAnalysis />
  },
  {
    path: "/models/trial-site-classifier",
    element: <Navigate to="/models/site-species-analysis" replace />
  },
  {
    path: "/models/model-2",
    element: <Model2 />
  },
  {
    path: "/models/model-3",
    element: <Model3 />
  },
  {
    path: "/models/clonal-eucalyptus-nursery",
    element: <ClonalEucalyptusNursery />
  },
  {
    path: "/models/:modelSlug",
    element: <ModelComingSoon />
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
