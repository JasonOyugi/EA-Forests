import type { EditorialCategory } from "@/app/landing/components/editorial-actions"

export type ArticleSection = {
  heading: string
  paragraphs: string[]
}

export type ForestryArticle = {
  slug: string
  title: string
  deck: string
  category: EditorialCategory
  topic: string
  author: string
  publishedAt: string
  readTime: string
  image: string
  featured?: boolean
  sections: ArticleSection[]
}

export const forestryArticles: ForestryArticle[] = [
  {
    slug: "how-forests-make-money-east-africa",
    title: "How forests make money in East Africa",
    deck: "A practical look at the decisions that turn land, planting material and time into a productive forest asset.",
    category: "Information",
    topic: "Commercial forestry",
    author: "EA Forests Editorial Desk",
    publishedAt: "12 Aug 2026",
    readTime: "8 min read",
    image: "/forest.webp",
    featured: true,
    sections: [
      { heading: "The commercial logic", paragraphs: ["Forestry returns are shaped long before harvest. Site choice, species, genetics, establishment quality and access to markets determine whether biological growth becomes commercial value.", "The strongest projects begin with a clear end market and work backwards to the planting decision. This prevents a technically successful forest from becoming a commercially stranded asset."] },
      { heading: "Where value is created", paragraphs: ["Value can accumulate through nursery production, establishment services, standing timber growth, processing, logistics and the sale of finished products. Each part of the chain carries a different risk and cash-flow profile.", "Investors should separate biological assumptions from price assumptions, then stress-test both before committing capital."] },
      { heading: "What to examine next", paragraphs: ["Compare suitable sites, verify planting material, identify credible operators and model more than one market scenario. EA Forests tools and directories are designed to support those checks."] },
    ],
  },
  {
    slug: "roundwood-demand-moving",
    title: "Where roundwood demand is moving",
    deck: "Signals to watch when assessing processors, buyers and regional timber flows.",
    category: "Markets",
    topic: "Roundwood",
    author: "EA Forests Markets Desk",
    publishedAt: "11 Aug 2026",
    readTime: "6 min read",
    image: "/greenbuilding.webp",
    sections: [
      { heading: "Demand is local before it is regional", paragraphs: ["Delivered-log economics are sensitive to distance, road conditions, handling and the specifications of individual processors. A market map is therefore more useful than a single regional price."] },
      { heading: "Signals worth tracking", paragraphs: ["Processor intake, product mix, construction activity, utility demand and substitution between materials can all change the value of a standing forest.", "Treat price observations as dated market signals and record the location, grade, unit and delivery basis behind every quote."] },
    ],
  },
  {
    slug: "best-planting-material-east-africa",
    title: "Choosing planting material for East African sites",
    deck: "Why provenance, nursery quality and evidence from comparable environments matter.",
    category: "Information",
    topic: "Genetics & nurseries",
    author: "EA Forests Editorial Desk",
    publishedAt: "10 Aug 2026",
    readTime: "7 min read",
    image: "/eucalyptus.jpg",
    sections: [
      { heading: "Start with the planting objective", paragraphs: ["The right material depends on the product, rotation, site constraints and acceptable risk. Growth alone is not enough; form, survival, disease tolerance and product suitability also matter."] },
      { heading: "Ask for evidence", paragraphs: ["Request provenance information, nursery records and performance evidence from sites that genuinely resemble the intended planting area. Where evidence is incomplete, use smaller trials before scaling."] },
    ],
  },
  {
    slug: "dryland-forestry-investment-case",
    title: "The investment case for dryland forestry",
    deck: "Dryland projects require a different technical and financial discipline—but can unlock underused landscapes.",
    category: "Investments",
    topic: "Drylands",
    author: "EA Forests Projects Desk",
    publishedAt: "8 Aug 2026",
    readTime: "9 min read",
    image: "/drylands.webp",
    sections: [
      { heading: "Design for constraint", paragraphs: ["Water availability, establishment timing, browsing, fire and access shape dryland forestry. Project design must address these constraints explicitly rather than importing assumptions from humid plantation systems."] },
      { heading: "Model risk honestly", paragraphs: ["Use survival ranges, staged planting and conservative growth scenarios. The highest-return scenario should never be the only one presented to decision-makers."] },
    ],
  },
  {
    slug: "model-before-committing-capital",
    title: "Model the forest before committing capital",
    deck: "A decision model makes assumptions visible early enough to change them.",
    category: "Models",
    topic: "Investment modelling",
    author: "EA Forests Models Desk",
    publishedAt: "3 Aug 2026",
    readTime: "5 min read",
    image: "/apps.png",
    sections: [
      { heading: "A model is a conversation", paragraphs: ["The purpose of a forestry model is not to manufacture certainty. It is to make the project logic inspectable: establishment costs, survival, growth, product recovery, price, timing and risk."] },
      { heading: "Use ranges", paragraphs: ["Build base, downside and upside cases. Test the assumptions that have the greatest effect on value and identify the decisions that can still be changed."] },
    ],
  },
  {
    slug: "high-performance-forest-assets",
    title: "What makes a high-performance forest asset?",
    deck: "Performance comes from alignment across genetics, site, management, measurement and market.",
    category: "Investments",
    topic: "Forest assets",
    author: "EA Forests Projects Desk",
    publishedAt: "2 Aug 2026",
    readTime: "8 min read",
    image: "/about.webp",
    sections: [
      { heading: "Performance is a system", paragraphs: ["No single input creates a high-performance forest. Superior material can disappoint on the wrong site, while good land can underperform under weak establishment and delayed interventions."] },
      { heading: "Measure what changes decisions", paragraphs: ["Inventory, survival, growth, health and operations data should lead to action. A smaller set of reliable measures is more useful than a large dashboard that nobody uses."] },
    ],
  },
  {
    slug: "nursery-partnerships-east-africa",
    title: "Building better nursery partnerships",
    deck: "A useful partnership aligns demand, production timing, quality standards and field feedback.",
    category: "Markets",
    topic: "Nurseries",
    author: "EA Forests Markets Desk",
    publishedAt: "30 Jul 2026",
    readTime: "6 min read",
    image: "/tz.jpg",
    sections: [
      { heading: "Move beyond spot buying", paragraphs: ["Planting material is time-sensitive inventory. Earlier demand visibility lets nurseries plan seed, propagation, hardening and delivery with fewer compromises."] },
      { heading: "Close the feedback loop", paragraphs: ["Field survival and early growth data should return to the nursery. That information improves production decisions and creates accountability across the supply relationship."] },
    ],
  },
  {
    slug: "site-species-analysis-guide",
    title: "A practical guide to site–species analysis",
    deck: "Use climate, soils, topography and trial evidence as decision support—not as isolated answers.",
    category: "Models",
    topic: "Site analysis",
    author: "EA Forests Models Desk",
    publishedAt: "28 Jul 2026",
    readTime: "10 min read",
    image: "/maps.jpg",
    sections: [
      { heading: "Combine evidence", paragraphs: ["Site classification is strongest when mapped environmental data is checked against field observations and performance evidence from comparable trials."] },
      { heading: "Keep uncertainty visible", paragraphs: ["Data resolution, missing observations and changing climate conditions all affect confidence. Document these limits alongside the recommendation."] },
    ],
  },
]

export const articleTopics = Array.from(new Set(forestryArticles.map((article) => article.topic)))

export function getArticleBySlug(slug?: string) {
  return forestryArticles.find((article) => article.slug === slug)
}
