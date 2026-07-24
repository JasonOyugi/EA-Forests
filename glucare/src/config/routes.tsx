import { lazy } from 'react'
import { Navigate } from 'react-router-dom'

const Landing = lazy(() => import('@/app/landing/page'))
const ShopIndex = lazy(() => import("@/app/shop/page"))
const ShopPage = lazy(() => import("@/app/shop/shop-page"))
const ShopProductPage = lazy(() => import("@/app/shop/product-page"))
const Calendar = lazy(() => import('@/app/calendar/page'))
const Models = lazy(() => import('@/app/models/page'))
const BmiCalculator = lazy(() => import('@/app/models/bmi-calculator/page'))
const DiabetesRiskAssessment = lazy(() => import('@/app/models/diabetes-risk-assessment/page'))
const Vitality3D = lazy(() => import('@/app/models/vitality-3d/page'))
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
    path: "/calendar",
    element: <Calendar />
  },
  {
    path: "/models",
    element: <Models />
  },
  {
    path: "/models/bmi-calculator",
    element: <BmiCalculator />
  },
  {
    path: "/models/diabetes-risk-assessment",
    element: <DiabetesRiskAssessment />
  },
  {
    path: "/models/vitality-3d",
    element: <Vitality3D />
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
