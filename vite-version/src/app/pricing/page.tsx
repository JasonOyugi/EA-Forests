import { BaseLayout } from "@/components/layouts/base-layout"
import { PricingPlans } from "@/components/pricing-plans"
import { FeaturesGrid } from "./components/features-grid"
import { FAQSection } from "./components/faq-section"
import { Badge } from "@/components/ui/badge"
import {
  landingSectionIntro,
  landingBadgeClass,
  landingHeadingClass,
  landingLeadClass,
} from "../landing/components/landing-shared"
import { flagshipPricingCatalog } from "@/app/shop/lib/flagship-pricing"

// Import data
import featuresData from "./data/features.json"
import faqsData from "./data/faqs.json"

const pricingPlans = [
  {
    id: "core-forests",
    name: flagshipPricingCatalog["core-forests"].name,
    description: "A low-risk entry point into professionally designed forestry investments.",
    price: "$250",
    frequency: "/ha",
    features: [
      "Conventional species and proven silviculture",
      "Clear establishment economics for predictable returns",
      "Designed for first-time forestry investors",
    ],
  },
  {
    id: "high-performance-forests",
    name: flagshipPricingCatalog["high-performance-forests"].name,
    description: "High-yield systems with advanced genetics, modeling, and market positioning.",
    price: "$550",
    frequency: "/ha",
    features: [
      "Optimized genetics and site-specific design",
      "Advanced monitoring and performance analytics",
      "Built for return-focused capital and scale",
    ],
    popular: true,
  },
  {
    id: "dryland-frontier-forests",
    name: flagshipPricingCatalog["dryland-frontier-forests"].name,
    description: "Resilient forestry strategies for arid and semi-arid landscapes.",
    price: "$550",
    frequency: "/ha",
    features: [
      "Dryland-adapted species and moisture-smart design",
      "Higher-return frontier forestry with climate resilience",
      "Best suited for experienced forestry investors",
    ],
  },
]

export default function PricingPage() {
  return (
    <BaseLayout title="Pricing Plans" description="Compare forestry plans built for land, service coordination, and market execution.">
      <div className="px-4 lg:px-6">
        <section id="pricing" className="mx-auto max-w-3xl text-center py-16 sm:py-20 lg:py-24">
          <div className={landingSectionIntro}>
            <Badge variant="outline" className={landingBadgeClass}>
              Pricing
            </Badge>
            <h1 className={landingHeadingClass}>
              Select the forestry plan that fits your project.
            </h1>
            <p className={landingLeadClass}>
              From early-stage site planning to portfolio-level execution, every plan is built to support land, service coordination, and market readiness.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className='pb-12'>
          <PricingPlans plans={pricingPlans} mode="pricing" />
        </section>

        {/* Features Section */}
        <FeaturesGrid features={featuresData} />

        {/* FAQ Section */}
        <FAQSection faqs={faqsData} />
      </div>
    </BaseLayout>
  )
}
