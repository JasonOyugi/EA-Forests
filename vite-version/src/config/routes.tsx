import { lazy } from 'react'
import { Navigate } from 'react-router-dom'

// Lazy load components for better performance
const Landing = lazy(() => import('@/app/landing/page'))
const Dashboard = lazy(() => import('@/app/dashboard/page'))
const DashboardAssetsMap = lazy(() => import('@/app/dashboard/assets-map/page'))
const Invoice = lazy(() => import('@/app/invoice/[id]/page'))
const AddAsset = lazy(() => import('@/app/assets/add/page'))
const ShopIndex = lazy(() => import("@/app/shop/page"))
const ShopPage = lazy(() => import("@/app/shop/shop-page"))
const ShopProductPage = lazy(() => import("@/app/shop/product-page"))
const Calendar = lazy(() => import('@/app/calendar/page'))
const FAQs = lazy(() => import('@/app/faqs/page'))
const Pricing = lazy(() => import('@/app/pricing/page'))
const Models = lazy(() => import('@/app/models/page'))
const SiteSpeciesAnalysis = lazy(() => import('@/app/models/site-species-analysis/page'))
const Model2 = lazy(() => import('@/app/models/model-2/page'))
const Model3 = lazy(() => import('@/app/models/model-3/page'))
const ClonalEucalyptusNursery = lazy(() => import('@/app/models/clonal-eucalyptus-nursery/page'))
const Articles = lazy(() => import('@/app/articles/page'))
const Article = lazy(() => import('@/app/articles/article-page'))
const Newsletter = lazy(() => import('@/app/newsletter/page'))

// Auth pages
const SignIn = lazy(() => import('@/app/auth/sign-in/page'))
const SignUp = lazy(() => import('@/app/auth/sign-up/page'))
const ForgotPassword = lazy(() => import('@/app/auth/forgot-password/page'))

// Error pages
const Unauthorized = lazy(() => import('@/app/errors/unauthorized/page'))
const Forbidden = lazy(() => import('@/app/errors/forbidden/page'))
const NotFound = lazy(() => import('@/app/errors/not-found/page'))
const InternalServerError = lazy(() => import('@/app/errors/internal-server-error/page'))
const UnderMaintenance = lazy(() => import('@/app/errors/under-maintenance/page'))

// Settings pages
const UserSettings = lazy(() => import('@/app/settings/user/page'))
const AccountSettings = lazy(() => import('@/app/settings/account/page'))
const BillingSettings = lazy(() => import('@/app/settings/billing/page'))
const AppearanceSettings = lazy(() => import('@/app/settings/appearance/page'))
const NotificationSettings = lazy(() => import('@/app/settings/notifications/page'))
const ConnectionSettings = lazy(() => import('@/app/settings/connections/page'))

export interface RouteConfig {
  path: string
  element: React.ReactNode
  children?: RouteConfig[]
}

export const routes: RouteConfig[] = [
  // Public front door
  {
    path: "/",
    element: <Navigate to="landing" replace />
  },

  // Landing Page
  {
    path: "/landing",
    element: <Landing />
  },
  {
    path: "/newsletter",
    element: <Newsletter />
  },
  {
    path: "/articles",
    element: <Articles />
  },
  {
    path: "/articles/:articleSlug",
    element: <Article />
  },

  // Dashboard Routes
  {
    path: "/dashboard",
    element: <Dashboard />
  },
  {
    path: "/dashboard/assets-map",
    element: <DashboardAssetsMap />
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

  // Application Routes
  {
    path: "/calendar",
    element: <Calendar />
  },

  // Invoice detail
  {
    path: "/invoice/:id",
    element: <Invoice />
  },

  // Asset management
  {
    path: "/assets/add",
    element: <AddAsset />
  },

  // Content Pages
  {
    path: "/faqs",
    element: <FAQs />
  },
  {
    path: "/pricing",
    element: <Pricing />
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

  // Authentication Routes
  {
    path: "/auth/sign-in",
    element: <SignIn />
  },
  {
    path: "/auth/sign-up",
    element: <SignUp />
  },
  {
    path: "/auth/forgot-password",
    element: <ForgotPassword />
  },

  // Error Pages
  {
    path: "/errors/unauthorized",
    element: <Unauthorized />
  },
  {
    path: "/errors/forbidden",
    element: <Forbidden />
  },
  {
    path: "/errors/not-found",
    element: <NotFound />
  },
  {
    path: "/errors/internal-server-error",
    element: <InternalServerError />
  },
  {
    path: "/errors/under-maintenance",
    element: <UnderMaintenance />
  },

  // Settings Routes
  {
    path: "/settings/user",
    element: <UserSettings />
  },
  {
    path: "/settings/account",
    element: <AccountSettings />
  },
  {
    path: "/settings/billing",
    element: <BillingSettings />
  },
  {
    path: "/settings/appearance",
    element: <AppearanceSettings />
  },
  {
    path: "/settings/notifications",
    element: <NotificationSettings />
  },
  {
    path: "/settings/connections",
    element: <ConnectionSettings />
  },

  // Catch-all route for 404
  {
    path: "*",
    element: <NotFound />
  }
]
