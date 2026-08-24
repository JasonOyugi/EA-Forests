# EA Forests Sector Hub: Master Product and Implementation Blueprint

Status: implementation-ready product specification  
Version: 1.0  
Prepared: 2026-08-14  
Scope: the public Sector Hub only; this document does not authorize a redesign of the existing dashboard, models, accounts, or marketplace.

## 1. How to read this blueprint

This specification uses three evidence labels throughout:

- **Observed** means directly verified in the live reference or the repository.
- **Inferred** means a likely purpose or responsive behavior derived from the verified structure. It must be visually validated before implementation is accepted.
- **Proposed** means the EA Forests product or technical decision recommended here.

The live reference was inspected through its rendered public document structure on 2026-08-14. The available in-app browser had no active browser runtime, so exact pixel measurements, hover transitions, and viewport screenshots could not be directly recorded. Responsive observations that depend on visual rendering are therefore marked **Inferred** and are converted into explicit, testable EA Forests requirements rather than represented as copied facts.

## 2. Executive decision and product north star

### Decision

**Proposed:** Build the Sector Hub as a separate, server-rendered/publication-oriented React application inside this repository. Keep the existing Vite application responsible for signed-in applications, accounts, models, dashboards, and marketplace experiences.

Use a true monorepo boundary:

- `apps/sector-hub`: public editorial and intelligence publication.
- `vite-version`: existing applications, accounts, corporate prototype, and commerce.
- `packages/contracts`: framework-neutral link and reference contracts shared between the two web surfaces.
- `packages/design-tokens`: a small, versioned set of brand primitives; do not begin with a shared component library.

The recommended publication framework is **Next.js App Router** because the current team stack is React and TypeScript and the hub needs pre-rendered routes, route-specific metadata, share images, sitemaps, server-side content access, and incremental publication. This is a proposed choice, not a claim that Next.js is already installed.

### Evidence for the decision

- **Observed:** [`vite-version/src/config/routes.tsx`](../vite-version/src/config/routes.tsx) is a React Router client application. `/newsletter`, `/articles`, and `/articles/:articleSlug` are prototype routes alongside dashboard, model, settings, authentication, and shop routes.
- **Observed:** [`vite-version/vite.config.ts`](../vite-version/vite.config.ts) configures a conventional Vite build and a local `/api` proxy; it has no SSR, SSG, or prerender pipeline.
- **Observed:** [`vite-version/index.html`](../vite-version/index.html) contains template-era global metadata and cannot supply reliable per-article title, description, canonical, Open Graph, or structured-data output.
- **Observed:** [`vite-version/src/app/articles/data.ts`](../vite-version/src/app/articles/data.ts) is static TypeScript fixture data, not an editorial publishing system.
- **Observed:** [`backend/app/main.py`](../backend/app/main.py) serves forestry model/data capabilities, not content, contributor, search, or subscriber APIs.
- **Observed:** [`vite-version/src/app/shop/types.tsx`](../vite-version/src/app/shop/types.tsx) already separates products, services, and assets. That is the correct commerce boundary to preserve.
- **Observed:** [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) does not currently declare workspace packages and must be corrected before adding a second JavaScript application.
- **Observed:** [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) is a template-oriented static Vite deployment and is not a viable production pipeline for an SSR/SSG publication.

### North star

> Help an East African forestry decision-maker move from “what changed?” to “what should I do next?” in one trusted journey.

The hub succeeds when a visitor can discover a consequential development, understand its regional and commercial implications, inspect evidence, open a relevant tool or data view, find an appropriate market action, and subscribe to the brief that will bring them back.

This produces five product qualities:

1. **Authority:** explicit authorship, dates, sources, review status, corrections, and disciplined editorial/commercial separation.
2. **Orientation:** five stable verticals organize a sector that otherwise feels fragmented.
3. **Momentum:** alternating feature, compact, media, data, and archive modules create multiple useful next steps.
4. **Utility:** articles connect to tools and market actions without becoming advertisements.
5. **Habit:** recurring briefings, contributor follows, topic subscriptions, archives, and search make return visits worthwhile.

### Initial outcome metrics

Measure a baseline before launch, then target after 90 days:

- At least 35% of article sessions continue to another hub page, tool, or marketplace context.
- At least 8% of engaged article readers click a related tool or marketplace action; report the two separately.
- At least 4% of unique hub visitors subscribe to a newsletter or topic briefing.
- At least 25% of returning users enter through a topic page, archive, search, newsletter, or contributor page rather than the homepage.
- At least 90% of published stories have complete byline, source, reviewed date, topic, and SEO fields.
- Core Web Vitals at the 75th percentile: LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1.

## 3. Audiences and journeys

### Primary audiences

| Audience | Immediate question | Evidence needed | Valuable next action |
|---|---|---|---|
| Grower or landowner | What should I plant, change, or monitor? | Region, species, genetics, costs, practical guidance | Open a suitability model; find planting material or a service |
| Nursery or genetics professional | Which material and standards matter now? | Provenance, trials, protocols, regulation, supplier context | Compare genetics; inspect seedling listings; subscribe to Genetics |
| Investor, lender, or asset manager | Is the opportunity credible and financeable? | Returns, risk, market records, policy, assumptions, disclosures | Open an investment model; review land/assets; contact a verified provider |
| Policymaker or institution | What changed and who is affected? | Primary sources, dates, jurisdictions, stakeholder analysis | Open a tracker/report; follow Policy; share a brief |
| Forestry operator or service provider | Which practices or technologies improve performance? | Demonstrations, cost/benefit, compatibility, case studies | Watch a field briefing; inspect services/technology providers |
| Researcher, student, or journalist | Where is the reliable background and source trail? | Author credentials, citations, update history, archives | Search the library; follow a contributor; cite a permanent URL |

### Core journey: development to decision

1. User enters through a shared story, search result, newsletter, or homepage lead.
2. Headline, deck, topic, date, author, and “why it matters” establish relevance in under ten seconds.
3. The article provides evidence, jurisdiction, affected actors, and source links.
4. An inline contextual module offers one relevant data/tool action after sufficient context, never before the first substantive section.
5. The end matter offers related topic coverage, contributor expertise, one tool action, and—only where relevant—one clearly labeled marketplace action.
6. A topic-specific subscription captures future intent.

### Supporting journeys

- **Monitor a vertical:** Topic landing -> lead development -> latest reporting -> evergreen explainer -> expert -> topic briefing subscription.
- **Investigate a claim:** Search -> filtered Knowledge Library -> article -> citations/update history -> special project or market record.
- **Evaluate an opportunity:** Investment analysis -> assumptions/risk box -> model -> separately labeled land or investment listing.
- **Solve a field problem:** Technology/Genetics story -> demonstration video -> tool -> service or seedling category.
- **Assess credibility:** Article -> contributor profile -> credentials/affiliations -> recent work -> corrections and methodology.

## 4. Reference analysis: what to preserve and why

### Verified reference structure

The following is **Observed** on the live reference:

- A broad “Discover” navigation strip exposes current destinations and recurring brands before the lead story.
- The homepage opens with a dominant topic-led story package, followed by supporting article and podcast/media entries.
- “The Latest” mixes topics and uses compact cards with topic, author/show, and reading or listening time.
- “Noteworthy Reads” is a denser, curated title list that reduces image dependence.
- Newsletter and special-project features are visually distinguished from the latest feed.
- Video, podcasts, shorts, thematic packages, “Great Reads,” and the archive recur later, changing the page's format and density.
- Topic pages have their own title and discovery strip, a lead feature, latest content, curated reads, and deeper packages.
- Contributor pages lead with identity, role, biography, a highlighted story, and recent articles.
- The archive provides filters for topic, medium, creator, and time before a chronological result list.
- Article pages lead with topic, headline, deck, image credit, author/date/read time, embed related media in context, end with contributor identity, then reopen discovery through “Keep Exploring,” newsletter, and archive prompts.

### Responsive caveat

- **Observed:** The public document contains repeated headline and card variants and alternative title lengths. This is evidence of breakpoint- or presentation-specific variants in the output.
- **Inferred:** Wide programmed compositions become stacked streams; horizontal discovery remains scrollable; dense lists retain text priority; controls collapse into drawers or compact rows.
- **Proposed:** EA Forests will implement and test these transformations explicitly in Section 13 rather than attempting to reproduce unverified pixel behavior.

### Psychological and usability purpose

| Pattern | User effect | Why it works for forestry |
|---|---|---|
| One dominant lead | Reduces choice anxiety and signals editorial judgment | Users quickly identify the development EA Forests considers most consequential |
| Supporting cluster | Supplies breadth without competing with the lead | A policy change can be paired with market reaction, an interview, and a tool |
| Latest + curated lists | Balances recency with durable importance | The newest item is not always the most decision-relevant item |
| Topic mini-publications | Builds a stable mental map and expertise signal | Policy, Finance, Investments, Genetics, and Technology need distinct depth and voices |
| Mixed media and density | Resets attention and supports different learning modes | Field demonstrations, interviews, data, and analysis require different presentations |
| Recurring formats | Creates predictable value and habit | “Policy Watch” or “Market Pulse” gives users a reason to return on schedule |
| Visible contributor identity | Transfers human credibility to the publication | High-stakes claims need accountable experts, affiliations, and conflicts disclosed |
| Search and archive | Converts publishing volume into accumulated utility | Forestry knowledge has long useful lives and is often found by species, country, or date |
| Article continuation | Prevents a dead end after a high-intent read | The natural next step can be evidence, a model, a provider, or a briefing subscription |
| Controlled visual variation | Signals a new mode without creating chaos | Dark data panels, calm evergreen surfaces, and vivid field media clarify content type |

## 5. Reference-to-EA implementation contracts

Each pattern below is a complete design contract.

### 5.1 Discovery rail

- **EA use case:** current policies, timber markets, carbon, nurseries, species, and investment themes.
- **Component/template:** `DiscoveryRail` containing `DiscoveryChip` links; editorially ordered, not algorithmic in v1.
- **Content requirement:** 6-14 active destinations, each with label, href, optional topic, start/end scheduling, and accessible name.
- **Interaction:** native horizontal scroll, keyboard-accessible previous/next buttons when overflow exists, visible focus, no drag-only requirement.
- **Responsive rule:** single-line rail at every width; 24 px edge peek on small screens to signal overflow; controls may hide only when native scrolling remains obvious.
- **Acceptance:** every destination is reachable by keyboard; no page-level horizontal overflow at 320 px; first six items are visible without interaction at 1440 px; expired items do not render.

### 5.2 Lead editorial package

- **EA use case:** the most consequential current forestry development plus two to four complementary perspectives.
- **Component/template:** `LeadPackage`, `LeadStory`, `SupportingStory`, and optional `MediaStory`.
- **Content requirement:** one lead with image, deck, topic, contributor, publish date, reading time; 2-4 supports with intentionally different angles.
- **Interaction:** whole-card hit areas without nested-link conflicts; image and title share one destination; hover changes underline/contrast/scale by no more than 1.02.
- **Responsive rule:** 12-column asymmetric composition at >=1024 px; one lead followed by compact supports below 1024 px; image ratios remain reserved to avoid layout shift.
- **Acceptance:** exactly one `h1`; lead title is visually at least 1.5x a support title; editorial configuration rejects zero or multiple lead items; CLS <=0.1 in the module.

### 5.3 Latest Forestry Intelligence

- **EA use case:** fast scanning of newly published cross-sector developments.
- **Component/template:** `LatestFeed` using `CompactStoryRow` on small screens and mixed `StoryCard` sizes on wide screens.
- **Content requirement:** 6-12 items ordered by `publishedAt`, with format, topic, country/region when relevant, and duration.
- **Interaction:** “View all” enters the library with sort=newest; no infinite scroll on the homepage.
- **Responsive rule:** 3- or 4-column grid at >=1024 px; two columns at 640-1023 px; rows at <640 px.
- **Acceptance:** displayed order matches the content source; each card exposes format and date to assistive technology; no title truncates below two lines.

### 5.4 Editor's Briefing

- **EA use case:** a compact set of high-consequence or evergreen reads selected by the editorial team.
- **Component/template:** `EditorsBriefing`, an ordered text-first list with optional ordinal and short rationale.
- **Content requirement:** 5-10 items, manual rank, no duplicate URL, optional “why now” of <=120 characters.
- **Interaction:** title links only; concise hover underline; analytics capture rank and destination.
- **Responsive rule:** remain text-first at all widths; split into two columns only when each column has >=3 entries.
- **Acceptance:** an editor can reorder without code; DOM order matches visual order; list remains readable with images disabled.

### 5.5 Topic package and topic mini-publication

- **EA use case:** Policy, Finance, Investments, Genetics, or Technology as a coherent editorial desk.
- **Component/template:** `TopicPackage` on home; `TopicLandingTemplate` for the destination.
- **Content requirement:** topic identity, one lead, 3-6 latest items, 3-6 evergreen items, contributors, media, tools, marketplace mappings, and subscription offer.
- **Interaction:** package title and “Explore” link reach the same canonical topic; cards retain their direct destinations.
- **Responsive rule:** wide package can use lead + rail/list; mobile becomes a lead followed by a compact ordered list.
- **Acceptance:** all five topics have unique introductions, accent tokens, SEO metadata, and at least one relevant tool or an explicit empty state; no topic color is the only status cue.

### 5.6 Tools and Data spotlight

- **EA use case:** move from understanding to calculation, map exploration, or model use.
- **Component/template:** `ToolSpotlight` and `ContextualToolCallout` backed by a `ToolReference` contract.
- **Content requirement:** capability, intended user, input expectations, output promise, access state, destination URL, and last reviewed date.
- **Interaction:** explicit external-surface treatment (“Open tool”); preserve return context with campaign/referrer parameters, not browser-history tricks.
- **Responsive rule:** dark or high-contrast data surface; chart preview may collapse to a static accessible summary below 640 px.
- **Acceptance:** link resolves in the configured environment; tool is never presented as editorial evidence unless its methodology is cited; keyboard focus meets contrast requirements.

### 5.7 Marketplace and Opportunity spotlight

- **EA use case:** offer relevant seedlings, services, land, investments, or market products after editorial context.
- **Component/template:** `CommerceSpotlight` backed only by references to existing commerce entities.
- **Content requirement:** item ID/URL, type, shop, display snapshot, relationship reason, availability timestamp, and disclosure label.
- **Interaction:** disclosure is visible before click; analytics distinguish editorial-to-commerce referral from ordinary navigation.
- **Responsive rule:** never visually imitate an editorial card; use a labeled bordered/action surface at all widths.
- **Acceptance:** removing a listing does not invalidate the article; stale/unavailable references produce no broken link; every impression contains “Marketplace,” “Opportunity,” or “Service” labeling.

### 5.8 Media rail

- **EA use case:** Sector Conversations, expert interviews, field briefings, and demonstrations.
- **Component/template:** `MediaRail`, `MediaCard`, and dedicated podcast/video templates.
- **Content requirement:** title, topic, contributor/guest, duration, publish date, thumbnail, transcript status, hosting URL, and rights/credit.
- **Interaction:** rail supports buttons, keyboard, touch, and native scroll; media does not autoplay with sound.
- **Responsive rule:** 3-4 visible cards on wide screens and 1.15 cards on small screens; preserve stable poster ratios.
- **Acceptance:** every playable item has captions or transcript before publication; all controls have accessible labels; no dragging-only control.

### 5.9 Special project

- **EA use case:** country report, species atlas, investment index, or policy tracker.
- **Component/template:** `SpecialProjectFeature` on home and `SpecialProjectTemplate` with project-owned navigation.
- **Content requirement:** scope, methodology, owner, update cadence, edition/version, child entries, citations, download/data rights.
- **Interaction:** project subnavigation remains distinct from global navigation; show “last updated” near the project title.
- **Responsive rule:** expressive project art may change composition but not information order; child navigation becomes scrollable or a labeled menu.
- **Acceptance:** every project has a methodology page, stable landing URL, update date, owner, and collection-level structured data.

### 5.10 Article continuation loop

- **EA use case:** lead readers from analysis into evidence, experts, tools, relevant market actions, and subscription.
- **Component/template:** `ArticleEndMatter` with contributor, related topic, evidence, tool, commerce, and newsletter slots.
- **Content requirement:** manually curated primary relation plus deterministic fallback rules; commercial disclosure where applicable.
- **Interaction:** no modal interruption before the reader reaches 60% depth; end-of-article subscription can be dismissed and stays dismissed for the session.
- **Responsive rule:** 2-column related area on wide screens; single ordered stream on small screens; contributor precedes commercial action.
- **Acceptance:** article end never contains more than one primary tool CTA and one primary commerce CTA; related items exclude the current URL; relationship clicks are separately measurable.

### 5.11 Search and Knowledge Library

- **EA use case:** retrieve knowledge by subject, jurisdiction, species, medium, expert, and time.
- **Component/template:** `GlobalSearch`, `SearchResultsTemplate`, and `KnowledgeLibraryTemplate` with `FilterDrawer`.
- **Content requirement:** indexable title, deck/summary, body text, topics, tags, geography, species, contributor, format, dates, and access level.
- **Interaction:** URL-backed filters; debounced suggestions; explicit submit; clear all; result count; pagination or “load more,” not opaque infinite scroll.
- **Responsive rule:** persistent filter column at >=1024 px; modal/drawer below; active filters remain visible as removable chips.
- **Acceptance:** a copied filtered URL reproduces the result set; browser Back restores filters and scroll position; zero results suggests nearby topics and clears individual filters.

## 6. Platform boundaries and cross-surface rules

### Recommended host model

| Surface | Recommended host | Ownership |
|---|---|---|
| Corporate | `www.eaforests.com` | About, partnerships, pricing, institutional information |
| Sector Hub | `hub.eaforests.com` | Public editorial, media, contributors, projects, newsletters, search, archive |
| Applications | `app.eaforests.com` | Models, maps, calculators, dashboards, accounts |
| Marketplace | Initially under `app.eaforests.com/shop` | Products, services, assets, transactions |

The separate hub host is the default because it allows an independent deployment and content-oriented rendering without disturbing application code. Before production, the team must decide whether SEO authority is better served by proxying the hub at `www.eaforests.com/insights/*`. This is a deployment/brand decision, not a reason to combine codebases.

### Boundary rules

1. Editorial entities never contain commerce price, stock, transaction, or fulfillment logic.
2. Commerce entities remain canonical in the existing marketplace; the hub stores typed references and optional display snapshots only.
3. Tools remain canonical in the Vite application or backend; the hub stores capability metadata and destination links.
4. Cross-surface links use environment configuration, never hard-coded localhost or production domains.
5. Authentication is not required to read public hub content. A tool may require sign-in after an explicit handoff.
6. Sponsored, partner-supported, and marketplace content is labeled in the content model and UI before the click.
7. Analytics use a common event vocabulary and anonymous cross-domain identifier only after consent where required.

## 7. Route and information architecture

All routes below belong to the hub unless an external host is shown.

| Route | Purpose | Rendering/indexing |
|---|---|---|
| `/` | Programmed hub homepage | Static/ISR; index |
| `/latest` | Chronological cross-format intelligence feed | Static/ISR first page; index |
| `/topics` | All Topics index | Static/ISR; index |
| `/topics/[topicSlug]` | Topic mini-publication | Static/ISR; index |
| `/articles/[articleSlug]` | Analysis, news, briefing, explainer, opinion | Static/ISR; index |
| `/contributors` | Expert and contributor directory | Static/ISR; index |
| `/contributors/[contributorSlug]` | Identity, expertise, disclosure, recent work | Static/ISR; index |
| `/conversations` | Podcast/interview series and latest episodes | Static/ISR; index |
| `/conversations/[seriesSlug]` | Series identity, hosts, premise, and episode archive | Static/ISR; index |
| `/conversations/[seriesSlug]/[episodeSlug]` | Episode/watch/listen/transcript | Static/ISR; index |
| `/videos` | Field briefings and demonstrations | Static/ISR; index |
| `/videos/[videoSlug]` | Video watch page and transcript | Static/ISR; index |
| `/projects` | Special-project directory | Static/ISR; index |
| `/projects/[projectSlug]` | Project landing | Static/ISR; index |
| `/projects/[projectSlug]/[entrySlug]` | Project entry, data view, or report | Per format; index unless interactive/private |
| `/library` | Knowledge Library/archive | Server-render initial state; index base only |
| `/search` | Full-text results | Server-render; `noindex,follow` for query URLs |
| `/newsletters` | Newsletter center and preferences | Static shell; index |
| `/newsletters/[newsletterSlug]` | Brief description and public issue archive | Static/ISR; index |
| `/newsletters/[newsletterSlug]/[issueSlug]` | Web edition | Static/ISR; index according to editorial policy |
| `/methodology` | Editorial standards, corrections, AI policy, commercial policy | Static; index |
| `/about` | Hub-specific mission and masthead; link to corporate site | Static; index |

### Primary navigation

- Latest
- Policy
- Finance
- Investments
- Genetics
- Technology
- Tools & Data (external-surface indicator)
- Marketplace (external-surface indicator)

Secondary discovery exposes All Topics, Conversations, Videos, Projects, Library, Contributors, and Newsletters. Do not put every destination in the first navigation row.

## 8. Homepage module specification

The homepage is a programmed document, not a hard-coded sequence and not a pure chronological feed. Editors select module type, title, surface treatment, content references, schedule, and ordering through a validated `HomePageComposition` record.

### Editorial rhythm tokens

- **Canvas:** warm neutral background; readable dark ink; EA Forests green as brand/action, not a blanket card color.
- **Grid:** 4 columns mobile, 8 tablet, 12 desktop; max content width 1440 px; page gutters 20/32/48 px.
- **Type:** one expressive editorial display family and one highly legible text/UI family from the approved EA Forests font contract. Body line length 62-72 characters. Do not copy The Ringer's fonts.
- **Radii:** 12 px compact cards, 20-28 px features; reserve pill shapes for topics, status, and actions.
- **Section spacing:** 64-80 px mobile, 96-144 px desktop. Dense sections use internal spacing, not reduced separation between unrelated modules.
- **Image language:** people, forests, nurseries, field work, data, and regional geography; no generic “green business” stock imagery.

### Sequence and visual contract

| # | Module | Layout, surface, and density | Required content | Primary purpose |
|---|---|---|---|---|
| 1 | Publication header | Compact utility bar + strong masthead; sticky only after masthead passes | Brand, primary nav, search, subscribe, app/market links | Orientation and persistent retrieval |
| 2 | Search and primary nav | Search trigger is text + icon on wide screens, icon with accessible name on small screens | Query entry, nav destinations | Make a deep platform feel controllable |
| 3 | Current-topic rail | Edge-to-edge within shell; compact chips; no card grid | 6-14 scheduled themes | Curiosity and timeliness |
| 4 | Lead package | Large image/title field plus 2-4 compact supports; maximum visual contrast | Lead + supporting perspectives | Declare editorial judgment |
| 5 | Latest Forestry Intelligence | Lighter surface; compact, regular rhythm; 6-12 items | Cross-topic newest items | Momentum and scanning |
| 6 | Editor's Briefing | Text-first numbered list, strong rules, few/no images | 5-10 curated reads | Authority beyond chronology |
| 7 | Five topic packages | Alternate lead+list, split feature, and horizontal rail patterns; never five identical grids | Complete topic-package contract | Demonstrate vertical depth |
| 8 | Tools and Data | Dark/high-contrast technical surface; one dominant tool plus small related links | Capability, preview, methodology, destination | Convert insight into analysis |
| 9 | Marketplace and Opportunity | Clearly labeled action surface; restrained imagery; no editorial mimicry | 3-6 typed commerce references | Convert relevant intent without harming trust |
| 10 | Media | Image/poster-led horizontal rail; duration and transcript state | Interviews, video, field briefings | Change learning mode and reset attention |
| 11 | Special project | Immersive full-width band with project-owned art direction | Project, scope, update date, entry points | Signal depth and durable investment |
| 12 | Knowledge Library | Calm text-dense surface with filters/collections teaser | Collections, archive stats, recent evergreen | Make accumulated knowledge visible |
| 13 | Newsletter | High-contrast but simple form; weekly + topic preferences | Value proposition, cadence, privacy link | Establish return habit |
| 14 | Footer | Structured directory, not a logo graveyard | Topics, formats, standards, company, apps, market, legal | Recovery, transparency, complete IA |

### Homepage programming rules

- No article appears more than twice, and never in adjacent modules.
- Topic packages rotate their internal layout, but component variants are finite and documented.
- At least one of the first five content items is not an article (data, interview, or media) when such content is current.
- A commercial module cannot directly follow the lead package; at least one editorial/intelligence module separates them.
- Empty modules do not render. The composition validator rejects a homepage with fewer than: one lead, four latest items, three briefing items, and one subscription offer.
- Each module records an analytics `placementId` that is stable across cosmetic edits.

## 9. Topic landing-page specification

Each topic is a mini-publication sharing a template but owning its editorial point of view.

### Information order

1. Topic identity: name, one-sentence mandate, optional current desk note, subscribe action.
2. Topic discovery rail: timely subthemes, projects, recurring formats, and relevant tools.
3. Topic lead package: one lead plus 2-3 supporting perspectives.
4. Latest in topic: 6-12 items.
5. “Start here” evergreen explainers.
6. Relevant media/interviews.
7. Tools and data.
8. Experts and contributors.
9. Related marketplace action, explicitly labeled.
10. Topic archive and newsletter offer.

### Topic-specific framing

| Topic | Editorial promise | Example recurring formats | Natural action layer |
|---|---|---|---|
| Policy | Explain rules, institutions, compliance, and consequences by jurisdiction | Policy Watch, Regulation Explained, Regional Tracker | Compliance/advisory services where relevant |
| Finance | Explain prices, costs, capital, risk, and market signals | Market Pulse, Price Monitor, Finance Primer | Markets, roundwood, pricing, financial products |
| Investments | Evaluate opportunities, land, project structures, returns, and risk | Deal Review, Country Thesis, Risk Ledger | Investment hub, forests and land |
| Genetics | Connect provenance, breeding, planting material, trials, and performance | Species File, Provenance Note, Nursery Standard | Seed and Seedlings |
| Technology | Assess machinery, remote sensing, software, practices, and providers | Field Test, Tech Review, Workflow | Forestry Services and technology providers |

### Acceptance criteria

- The five routes share a template and pass the same schema tests but have unique title, description, accent, mandate, and content.
- Lead and latest items are restricted to the topic unless an editor explicitly marks a cross-topic inclusion.
- Every commerce block includes a relationship explanation such as “Planting material related to this genetics topic.”
- Topic subscription submits the topic preference, not only a generic newsletter ID.

## 10. Article-page specification

### Above the fold

1. Breadcrumbs: Hub -> Topic -> Article.
2. Format and topic labels.
3. Headline and deck.
4. “Why it matters” summary for news/policy/finance formats; optional only for essays/opinion.
5. Contributor(s), role/credentials, publish time, updated time, reading time.
6. Hero media with caption, credit, alt text, and rights metadata.

### Body system

- Article prose: 62-72 character measure, minimum 18 px equivalent at default zoom, line height 1.55-1.75.
- `ArticleBody` supports headings, paragraphs, lists, pull quotes, figures, tables, charts, maps, citations, footnotes, callouts, media embeds, and correction/update notes.
- Sticky share/contents controls may appear on wide screens only when they do not narrow the reading column or obscure focus.
- Inline tool callout appears after evidence/context, never as the first body block.
- Long tables have a semantic table, caption, horizontal overflow wrapper, and downloadable source when appropriate.
- Data claims display source and “as of” date. Policy claims include jurisdiction and effective date.

### Trust and independence

- Show author biography and relevant expertise after the body.
- Show contributor affiliations and declared conflicts when relevant.
- Show editorial status: reporting, analysis, opinion, partner-supported, or sponsored.
- Corrections are appended with timestamp and change summary; material corrections are not silently overwritten.
- Related marketplace actions are visually and semantically separate from evidence/citations.
- If an article evaluates a listed provider or asset, disclose any commercial relationship.

### End matter order

1. Sources/methodology and update history.
2. Contributor card.
3. Related coverage in the primary topic.
4. One contextual tool action.
5. One contextual marketplace action, if relevant.
6. Topic/newsletter subscription.

### Acceptance criteria

- Initial HTML contains the title, deck, byline, dates, article body, canonical, and JSON-LD without client JavaScript.
- Heading hierarchy has one `h1` and no skipped structural levels in authored content.
- All figures have caption/source; all external claims requiring evidence have an accessible source link.
- An updated article exposes both `datePublished` and `dateModified`.
- Share action uses canonical URL and works with native share where supported, with copy-link fallback.
- At 200% zoom and 320 CSS px width, the prose, tables, citations, and end matter remain operable without two-dimensional page scrolling.

## 11. Content and relationship model

### Shared principles

- Every entity has a stable opaque `id`; human-readable `slug` may change with redirects.
- All dates are ISO 8601 with timezone. Display uses the user's locale but preserves source timezone where material.
- Editorial workflow fields are separate from public fields.
- Relations use IDs/references, not duplicated full records.
- Geography and species use controlled vocabularies, not free-text tags alone.
- Commercial objects remain in commerce storage. Hub references fail closed when a target is unavailable.

### Common editorial fields

```ts
type EditorialStatus = "draft" | "in_review" | "scheduled" | "published" | "archived"
type AccessLevel = "public" | "subscriber" | "registered" | "private"
type EditorialLabel = "reporting" | "analysis" | "opinion" | "partner_supported" | "sponsored"

interface EditorialBase {
  id: string
  slug: string
  title: string
  summary: string
  status: EditorialStatus
  accessLevel: AccessLevel
  editorialLabel: EditorialLabel
  topicIds: string[]
  tagIds: string[]
  geographyIds: string[]
  speciesIds: string[]
  contributorIds: string[]
  publishedAt?: string
  updatedAt: string
  firstPublishedAt?: string
  heroMediaId?: string
  seo: SeoFields
  disclosure?: Disclosure
}
```

### Entity contracts

| Entity | Required distinguishing fields | Key relationships |
|---|---|---|
| `Topic` | slug, name, mandate, accent tokens, editor IDs, SEO, newsletter IDs | content, contributors, tools, commerce mapping |
| `Article` | deck, body blocks, format, reading time, citations, review/correction history, effective/as-of dates | topics, contributors, project, media, tool refs, commerce refs |
| `Contributor` | name, role, bio, expertise, credentials, affiliations, disclosures, portrait, contact/social | authored/reviewed content, topics |
| `PodcastSeries` | name, premise, artwork, feed URL, hosts, cadence | episodes, topics, newsletter |
| `PodcastEpisode` / `Interview` | audio URL, duration, guests, transcript, show notes | series, contributors, topics, related articles/tools |
| `Video` | playback/embed URL, duration, poster, captions, transcript, rights | topics, contributors, project, related tools |
| `SpecialProject` | scope, methodology, version, owner, update cadence, navigation config | articles, datasets, media, tools, downloads |
| `Newsletter` | name, promise, cadence, topic preferences, provider/list ID, consent copy | issue archive, topics, contributors |
| `NewsletterIssue` | subject, preheader, web body, sent date, provider campaign ID | newsletter, content references |
| `ToolReference` | external ID, capability, audience, input/output summary, methodology URL, access state, destination | topics, articles, project |
| `ProductReference` | commerce ID, shop, URL, relation reason, availability snapshot | genetics/finance content |
| `ServiceReference` | commerce ID, shop, URL, relation reason, provider disclosure | technology/policy content |
| `InvestmentAssetReference` | commerce ID, URL, asset kind, relation reason, risk/disclosure | investment content |
| `MarketRecordReference` | canonical series/record ID, unit, geography, as-of timestamp, methodology URL | finance content, charts |

### Typed cross-surface reference

```ts
type CommerceKind = "product" | "service" | "investment_asset" | "land_asset" | "market_record"

interface CrossSurfaceReference {
  id: string
  surface: "app" | "marketplace" | "external"
  kind: "tool" | CommerceKind
  canonicalId: string
  href: string
  label: string
  relationship: "explains" | "uses" | "supports" | "available_from" | "related_opportunity"
  reason: string
  reviewedAt: string
  disclosure?: string
}
```

Do not import `ShopItem` into the hub's editorial models. An adapter in `packages/contracts` maps a marketplace record to `CrossSurfaceReference` and can validate its availability.

### Homepage composition model

`HomePageComposition` contains ordered discriminated `ModuleConfig` records. Each module has `id`, `type`, `title`, `variant`, `surface`, `contentRefs`, `startsAt`, `endsAt`, and `placementId`. A schema validator enforces module-specific minimums, duplicate limits, schedules, and allowed entity types.

### Content lifecycle

Draft -> subject-matter review -> copy/edit review -> legal/commercial review when triggered -> scheduled -> published -> corrected/updated -> archived.

Publishing gates:

- Policy/finance/investment content requires citations and a named reviewer.
- Sponsored or partner-supported work requires disclosure.
- Video requires captions/transcript.
- Commerce references require a current availability check and relationship reason.
- Every publish action generates a preview and validates SEO/structured data.

## 12. Reusable component inventory

### Publication shell

- `PublicationHeader`, `Masthead`, `PrimaryNav`, `MobileNavDrawer`
- `DiscoveryRail`, `DiscoveryChip`
- `GlobalSearchDialog`, `SearchField`, `FilterDrawer`, `ActiveFilterList`
- `PublicationFooter`, `CrossSurfaceNav`

### Editorial cards and lists

- `StoryCard` variants: lead, feature, standard, compact, text-only
- `MediaCard`, `ToolCard`, `ProjectCard`, `ContributorCard`
- `CompactStoryRow`, `RankedLinkList`, `MetadataLine`, `TopicBadge`
- `LeadPackage`, `LatestFeed`, `EditorsBriefing`, `TopicPackage`
- `ToolSpotlight`, `CommerceSpotlight`, `MediaRail`, `SpecialProjectFeature`
- `KnowledgeLibraryPreview`, `NewsletterSignup`

### Article and trust

- `ArticleHeader`, `WhyItMatters`, `ArticleBody`, `ArticleFigure`, `DataTable`
- `CitationList`, `MethodologyNote`, `CorrectionHistory`, `DisclosureBanner`
- `ContributorByline`, `ContributorBio`, `ArticleEndMatter`, `RelatedContent`
- `ContextualToolCallout`, `ContextualCommerceCallout`, `ShareActions`

### System primitives

- `Container`, `Section`, `Stack`, `Cluster`, `Grid`, `Surface`
- `Heading`, `Text`, `Link`, `Button`, `IconButton`, `Badge`
- `VisuallyHidden`, `SkipLink`, `FocusRing`, `AspectMedia`, `Skeleton`

Components consume semantic tokens and structured entities. They do not fetch content internally; page/module loaders resolve data and pass explicit props. This keeps preview, testing, and CMS migration tractable.

## 13. Motion, interaction, and responsive behavior

### Motion principles

- Motion communicates hierarchy, state, or continuity; it is not decoration added to every card.
- Page entrance: at most a 12-20 px translate plus opacity over 240-400 ms, stagger <=60 ms, and only for above-the-fold groups.
- Hover/focus: color/underline 120-180 ms; image scale <=1.02 over 240 ms; no layout movement.
- Drawers/dialogs: 200-280 ms with opacity and transform. Focus is trapped, restored, and never waits for animation.
- Rails: native momentum scrolling and CSS scroll snap where it does not fight user input.
- Sticky header: transition after a measured sentinel crosses, not continuously tied to scroll position.
- No autoplaying carousel, scroll hijacking, pointer-following effect, or continuous parallax.
- `prefers-reduced-motion: reduce` removes nonessential transform, stagger, smooth scroll, and autoplay while preserving instant state changes.

### Interaction states

Every interactive component defines default, hover, focus-visible, active, disabled, loading, error, and success states. Hover never carries information unavailable to touch/keyboard users. Card containers cannot wrap multiple competing links in one anchor.

### Responsive matrix

| Range | Grid/gutters | Navigation | Content transformation |
|---|---|---|---|
| 320-639 px | 4 columns / 20 px | Compact header; menu drawer; search remains one tap away | Lead stacks; cards become rows; rails show 1.15 cards; filters use drawer; sticky sidebars disabled |
| 640-1023 px | 8 columns / 32 px | Compact primary destinations plus overflow | Two-column standard cards; lead still stacked/asymmetric; media rail shows ~2.2 cards |
| 1024-1439 px | 12 columns / 40 px | Full primary nav and search | Programmed asymmetric packages; persistent archive filters; optional article side rail |
| >=1440 px | 12 columns / 48 px, max 1440 | Full masthead/nav with controlled line length | Same composition with larger whitespace, never unlimited card stretching |

### Required responsive verification

Verify at 320x568, 375x812, 768x1024, 1024x768, 1280x800, and 1440x900 plus 200% zoom. Test actual long titles, multiple authors, missing images, large text, Swahili/East African place names, and slow images. A layout passes only if it has no clipped controls, accidental page overflow, hidden focus, or content-order mismatch.

## 14. Accessibility requirements

Target WCAG 2.2 AA.

- Semantic landmarks: one `main`; descriptive `nav` labels; headings follow content hierarchy.
- Provide a skip link and visible focus indicators with at least 3:1 contrast against adjacent colors.
- Text contrast >=4.5:1; large text and meaningful graphics >=3:1.
- Pointer targets meet WCAG's 24x24 CSS px minimum; design-system target is 44x44 for standalone controls.
- Rails and carousels work without dragging and do not trap horizontal keyboard navigation.
- Dialogs/drawers announce name and state, trap focus, close with Escape, and restore focus.
- Topic color is never the sole indicator; always include text.
- Images require purpose-specific alt text; decorative art uses empty alt; charts include a data summary/table.
- Video has synchronized captions; audio has a transcript; media controls are keyboard operable.
- Newsletter forms expose labels, purpose, consent, error association, success confirmation, and privacy link.
- Live search announcements are polite and do not announce on every keystroke.
- Dates, units, currencies, abbreviations, and acronyms are unambiguous in visible text or accessible descriptions.
- Automated checks with axe are necessary but not sufficient; each phase includes keyboard and screen-reader smoke tests.

## 15. SEO and structured data

### Rendering and metadata

- Public content returns meaningful server-rendered HTML.
- Use route-specific title, description, canonical, robots, Open Graph, Twitter/social image, authorship, publish/modified date, and alternate locale metadata.
- Pre-render stable content and use controlled revalidation/webhooks for publication updates.
- Generate `sitemap.xml`, `robots.txt`, RSS/Atom feeds, news/feed outputs if editorial cadence supports them, and image/video sitemaps where useful.
- Redirect old slugs permanently through a managed redirect registry.
- Search result URLs are `noindex,follow`; canonical archive/topic URLs remain indexable.
- Do not index preview, draft, account, or personalized preference URLs.

### JSON-LD map

| Page | Structured data |
|---|---|
| Site/home | `WebSite`, `Organization`, `CollectionPage` where appropriate |
| Topic | `CollectionPage`, `BreadcrumbList`, `ItemList` for visible curated items |
| Article | `Article` or `NewsArticle`, `BreadcrumbList`, linked `Person`/`Organization` authors |
| Contributor | `ProfilePage` with `Person`, affiliation and visible recent work |
| Video | `VideoObject` only on a page where the video is actually watchable |
| Podcast/interview | `PodcastEpisode`/`AudioObject` plus visible episode metadata |
| Special project | `CollectionPage`/`CreativeWorkSeries` and visible child items |
| Newsletter issue | `Article` or `CreativeWork` according to actual page content |
| Tool spotlight | `SoftwareApplication` only if the page visibly describes the actual application |
| Marketplace link | No `Product` markup on editorial pages unless the product is a primary visible page entity |

Structured data must mirror visible content. Validate representative URLs with schema validation and Google's Rich Results Test; markup is descriptive, not a guarantee of enhanced search appearance.

### Editorial SEO fields

`SeoFields` requires title, description, canonical override (rare), social title, social description, social image/alt, index policy, and optional keywords only for internal search. Article publishing requires a descriptive slug, primary topic, at least one author, hero/social image, dates, and citations policy status.

## 16. Repository integration plan

### Recommended folders and files

```text
apps/
  sector-hub/
    app/
      (publication)/
        page.tsx
        topics/page.tsx
        topics/[topicSlug]/page.tsx
        articles/[articleSlug]/page.tsx
        contributors/[contributorSlug]/page.tsx
        conversations/[seriesSlug]/page.tsx
        conversations/[seriesSlug]/[episodeSlug]/page.tsx
        videos/[videoSlug]/page.tsx
        projects/[projectSlug]/page.tsx
        library/page.tsx
        search/page.tsx
        newsletters/page.tsx
      api/
        preview/route.ts
        revalidate/route.ts
        newsletter/subscribe/route.ts
      layout.tsx
      sitemap.ts
      robots.ts
      opengraph-image.tsx
    components/
      article/
      cards/
      discovery/
      modules/
      navigation/
      search/
      system/
    content/
      adapters/
      fixtures/
      queries/
      schemas/
    lib/
      analytics/
      seo/
      env.ts
      routes.ts
    styles/
      tokens.css
      globals.css
    tests/
      accessibility/
      e2e/
      schema/
      visual/
packages/
  contracts/
    src/cross-surface-reference.ts
    src/analytics-events.ts
    src/routes.ts
  design-tokens/
    src/brand.css
docs/
  sector-hub-master-blueprint.md
  adr/
    0001-sector-hub-application-boundary.md
    0002-content-source.md
    0003-public-hosting-and-domains.md
```

### Integration steps

1. Replace the malformed root workspace file with explicit package globs and add root scripts that target packages without changing Vite's current scripts.
2. Add the hub app and lock its framework/runtime versions; do not move existing routes during scaffolding.
3. Extract only stable brand tokens and cross-surface contracts. Do not prematurely share stateful UI components between Vite and Next.js.
4. Implement a `ContentRepository` interface with fixture/local adapter first. Select and add a CMS adapter only after the editorial workflow decision.
5. Create an environment-based route registry for corporate, hub, app, API, and marketplace hosts.
6. Map current shop slugs (`seedlings`, `forests-land`, `forestry-services`, `roundwood`) to hub topic action layers without importing shop page components.
7. Link existing model routes as `ToolReference` records. Keep model execution and APIs where they are.
8. Leave `/newsletter` and `/articles` in Vite until the hub is production-ready; then add canonical tags/redirects as a separate migration PR.
9. Add independent CI and deployment workflows for the hub. Do not repurpose the current Vite SSH workflow silently.

### Content-source decision

Use a repository interface so the first vertical slice can run on validated fixtures. Before Phase 3, choose a CMS against these required capabilities:

- Draft preview and scheduled publishing.
- Modular but schema-constrained homepage composition.
- References among topics, contributors, articles, media, projects, and newsletters.
- Role-based workflow, audit history, and correction support.
- Image transformations, alt/credit/rights fields.
- Webhooks for revalidation and search indexing.
- Exportability and stable IDs.

Do not choose a CMS solely because it has a rich-text editor.

### Analytics contract

Minimum events: `content_impression`, `content_open`, `topic_open`, `search_submit`, `filter_change`, `media_start`, `media_complete`, `tool_referral`, `commerce_referral`, `newsletter_submit`, `newsletter_confirm`, and `share`. Each includes placement, content/entity ID, topic, source route, destination surface, and consent-compatible anonymous session context. Never put email, search free text, or sensitive forestry/business inputs into analytics payloads by default.

## 17. Phased, PR-sized implementation backlog

Each item below is intended to fit one coding-agent session or one pull request. A phase is complete only when every task and its phase acceptance criteria pass.

### Phase 0: decisions and workspace safety

- **PR 0.1:** Add ADR 0001 documenting the separate hub boundary, host assumptions, and rollback path.
- **PR 0.2:** Repair `pnpm-workspace.yaml`; add non-destructive root scripts; prove the existing Vite build is unchanged.
- **PR 0.3:** Add `packages/contracts` with route and `CrossSurfaceReference` schemas plus unit tests.
- **PR 0.4:** Record CMS and hosting evaluation matrices in ADRs 0002/0003; decisions may remain pending but criteria cannot.

Acceptance:

- Root install recognizes the hub-ready workspace layout without changing `vite-version` runtime behavior.
- Existing Vite build and lint/test baseline are recorded; new failures are zero.
- Cross-surface references reject unknown surface/kind values and invalid URLs.
- ADRs identify owner, decision deadline, alternatives, and consequences.

### Phase 1: hub foundation and vertical slice

- **PR 1.1:** Scaffold `apps/sector-hub` with TypeScript, linting, tests, environment validation, and a minimal server-rendered page.
- **PR 1.2:** Add semantic tokens, typography, grid, container primitives, skip link, and focus styles.
- **PR 1.3:** Add content schemas and validated fixtures for five topics, contributors, articles, tools, and references.
- **PR 1.4:** Build publication header, desktop/mobile nav, discovery rail, footer, and cross-surface links.
- **PR 1.5:** Build one server-rendered article vertical slice with metadata, JSON-LD, citations, contributor, and end matter.

Acceptance:

- HTML with JavaScript disabled contains usable navigation and the complete sample article.
- At 320, 768, 1024, and 1440 px, no shell component causes horizontal page overflow.
- Keyboard navigation reaches and operates every shell control; axe has zero serious/critical violations.
- Sample article produces unique canonical/OG metadata and valid Article/Breadcrumb JSON-LD.
- Existing Vite routes and builds remain unchanged.

### Phase 2: programmed homepage

- **PR 2.1:** Implement `HomePageComposition` schema, fixture adapter, schedule/duplicate validation, and preview output.
- **PR 2.2:** Build lead package and Latest Forestry Intelligence modules with responsive variants.
- **PR 2.3:** Build Editor's Briefing and finite Topic Package variants.
- **PR 2.4:** Build Tools/Data and labeled Marketplace/Opportunity modules using references only.
- **PR 2.5:** Build media rail, special-project feature, library preview, and newsletter module.
- **PR 2.6:** Assemble homepage, add analytics placements, visual-regression fixtures, and empty/error states.

Acceptance:

- Editors can reorder fixture module configs without editing page component code.
- Validator prevents invalid lead counts, undersupplied modules, adjacent duplicates, and expired placements.
- Homepage matches the 14-module information order, with at least four visibly distinct density/surface patterns.
- All rails work with keyboard, pointer, and touch and have non-drag controls.
- Lighthouse lab checks on the fixture homepage: accessibility >=95, performance >=85 on mobile profile, CLS <=0.1.

### Phase 3: topic, search, and library discovery

- **PR 3.1:** Implement reusable topic landing template and Policy fixture page.
- **PR 3.2:** Configure Finance, Investments, Genetics, and Technology using the same template contract.
- **PR 3.3:** Implement All Topics and contributor directory pages.
- **PR 3.4:** Add search-provider adapter, index schema, and local test adapter.
- **PR 3.5:** Build search results with URL-backed query, suggestions, empty/error states, and analytics.
- **PR 3.6:** Build Knowledge Library filters for topic, medium, contributor, geography, species, and time.

Acceptance:

- All five topic pages have unique content/metadata and pass one shared contract test suite.
- Copied search/library URLs reproduce query, filters, sort, and page; Back restores state.
- Base library is indexable; parameterized search pages are `noindex,follow`.
- Filtering is operable at 200% zoom and by keyboard/screen reader.
- Search result ranking fixtures demonstrate exact-title, topic, contributor, and body-text matching.

### Phase 4: article system and contributor trust

- **PR 4.1:** Implement complete body-block renderer with exhaustive type checking and unknown-block failure state.
- **PR 4.2:** Add figures, tables, charts/data summaries, citations, methodology, and source-date components.
- **PR 4.3:** Add corrections, update history, disclosures, editorial labels, and publish-gate validation.
- **PR 4.4:** Build contributor profile template with credentials, affiliations, disclosures, featured work, and archive.
- **PR 4.5:** Add deterministic related-content fallback and manually curated override tests.
- **PR 4.6:** Add article visual, accessibility, print, share, and structured-data test suite.

Acceptance:

- All body block types render semantic HTML; unsupported blocks fail preview/publish validation, not production rendering silently.
- A policy/finance/investment fixture cannot publish without citations and reviewer.
- Correction history is visible and reflected in `dateModified`.
- Contributor page initial HTML includes identity, credentials, disclosures, and recent work.
- Related content never returns the current article, unpublished content, or unavailable commerce target.

### Phase 5: media, projects, and newsletters

- **PR 5.1:** Build conversations index, series/episode schema, episode page, transcript, and audio adapter.
- **PR 5.2:** Build video index/watch page, captions/transcript contract, and VideoObject metadata.
- **PR 5.3:** Build special-project template, project navigation, methodology/version display, and one fixture project.
- **PR 5.4:** Build newsletter center, topic preferences, consent states, provider adapter, and double-opt-in flow.
- **PR 5.5:** Build public newsletter issue archive and feed output.

Acceptance:

- No media item can publish without duration, credit/rights, and transcript/caption state.
- Media never autoplays with sound; controls are keyboard and screen-reader operable.
- Special project exposes owner, methodology, version, and last-updated date.
- Newsletter submission handles pending, success, duplicate, invalid, rate-limit, and provider-failure states without losing entered preferences.
- Consent and unsubscribe/preference links are present and provider events contain no analytics PII.

### Phase 6: contextual tools and marketplace integration

- **PR 6.1:** Create environment route registry and tool catalog for existing model routes.
- **PR 6.2:** Create read-only marketplace reference adapter for the four current shops and stale-target handling.
- **PR 6.3:** Add contextual tool calls to article/topic/project templates with methodology labels.
- **PR 6.4:** Add contextual commerce calls, disclosures, relationship reasons, and referral analytics.
- **PR 6.5:** Add automated link/availability checks and an editorial report for broken/stale references.

Acceptance:

- Tool/market links resolve to the correct host in local, staging, and production configurations.
- No marketplace schema is merged into `Article`; all connections use typed references.
- Unavailable commerce targets are suppressed or replaced by a category fallback without broken links.
- Editorial and commercial cards are visually distinguishable without color alone.
- Referral reporting separates tools, products, services, investments/land, and markets.

### Phase 7: production content, SEO, performance, and launch

- **PR 7.1:** Implement chosen CMS adapter, preview authentication, webhooks, and migration scripts for approved fixtures.
- **PR 7.2:** Add programmatic metadata, social images, sitemaps, robots, feeds, redirects, and canonical checks.
- **PR 7.3:** Add hub CI with type/lint/unit/schema/accessibility/build checks and preview deployment.
- **PR 7.4:** Add production deployment workflow, monitoring, error reporting, analytics consent, and rollback runbook.
- **PR 7.5:** Migrate/redirect Vite `/newsletter` and `/articles` only after parity sign-off.
- **PR 7.6:** Run content QA, device/browser QA, accessibility audit, performance budget, and launch checklist.

Acceptance:

- Editors can preview, schedule, publish, update, correct, and unpublish without code changes.
- Representative page types pass metadata, canonical, sitemap, robots, and structured-data validation.
- CI blocks schema, TypeScript, accessibility, broken-link, and performance-budget regressions.
- Staging and production use separate keys/data and expose no secrets to the client bundle.
- Production has documented health checks, alert ownership, backup/export, rollback, and incident procedures.
- Vite editorial URLs redirect one-to-one with no redirect chain; application, model, dashboard, and shop routes remain unaffected.

## 18. Dependencies, risks, and unresolved decisions

### Decisions required before Phase 3

| Decision | Recommended default | Owner/evidence needed |
|---|---|---|
| Public host | `hub.eaforests.com`, with proxy-to-`www` evaluated | Product + SEO; current domain authority and infrastructure |
| CMS | Headless CMS selected by workflow matrix | Editorial + engineering; editor trial with homepage composition and corrections |
| Search | Hosted search if operational budget allows; adapter isolates vendor | Engineering; expected corpus, languages, facets, SLA, cost |
| Newsletter provider | Provider supporting preferences, double opt-in, webhooks, export | Growth/legal; countries, consent requirements, existing lists |
| Analytics | Privacy-conscious product analytics with cross-domain support | Product/legal; consent and retention policy |
| Media hosting | Dedicated audio/video host; hub owns canonical watch pages | Editorial/engineering; transcript, CDN, analytics, rights |
| Localization | English first, design/schema ready for Kiswahili | Product/editorial; translation workflow and launch markets |
| Paywall/access | Public at launch unless a business case is approved | Leadership; do not build speculative entitlement complexity |

### Principal risks and mitigations

- **Trust erosion from commerce adjacency:** enforce visible disclosures, editorial labels, schema separation, placement rules, and referral reporting.
- **Homepage becomes unmaintainable:** finite module variants, schema validation, preview, minimum/maximum content rules, and editorial runbook.
- **Two apps drift visually:** share semantic brand tokens and route contracts; use visual contract tests; avoid a tightly coupled cross-framework component package.
- **Monorepo change breaks Vite:** Phase 0 captures build baseline; root scripts are additive; hub deployment is independent.
- **CMS lock-in:** `ContentRepository` adapter, stable internal entities, exported IDs, and regular content export test.
- **SEO fragmentation across subdomains:** decide canonical host before migration; use one canonical per item, clean redirects, shared organization identity, and cross-surface navigation.
- **Broken tool/shop references:** scheduled availability checks, reviewed timestamps, category fallbacks, and fail-closed rendering.
- **Heavy imagery/media harms mobile:** responsive images, reserved aspect ratios, poster-first media, lazy loading below fold, route budgets.
- **Reference imitation overwhelms brand:** reproduce hierarchy and discovery mechanics, not logos, copy, fonts, code, or proprietary artwork.
- **Insufficient editorial capacity:** launch with fewer well-maintained modules; empty modules disappear; define cadence/owner before enabling a recurring format.

### Explicitly out of scope

- Redesigning dashboard navigation or workflows.
- Rewriting forestry models or moving model APIs.
- Replatforming marketplace transactions.
- Creating one universal article/product/service/asset schema.
- Building personalization, paywalls, native apps, comments, or social feeds before the core publishing loop is proven.
- Copying The Ringer source code, content, logo, font, imagery, or proprietary assets.

## 19. Global definition of done

A Sector Hub feature is done only when:

1. Its Observed/Inferred/Proposed basis is traceable to this blueprint or an ADR.
2. It has typed data, loading/empty/error states, and content validation.
3. It works by keyboard, at 200% zoom, with reduced motion, and at the required viewport matrix.
4. Initial HTML and metadata are correct for public content.
5. Analytics measure the intended user outcome without PII leakage.
6. Cross-surface links are environment-safe and disclose destination/context.
7. Unit/schema tests cover rules; E2E covers the critical journey; visual tests cover programmed variants.
8. Documentation explains editorial use, limits, and rollback.
9. Existing Vite applications, models, accounts, and marketplace pass their baseline checks.

## 20. Research sources

Reference pages inspected on 2026-08-14:

- [The Ringer homepage](https://www.theringer.com/)
- [The Ringer NBA topic page](https://www.theringer.com/topic/nba)
- [The Ringer article example](https://www.theringer.com/2026/08/13/nba/mark-walter-los-angeles-lakers-money-sold-federal-investigation-dodgers)
- [The Ringer contributor example](https://www.theringer.com/creator/katie-baker)
- [The Ringer archive](https://www.theringer.com/archive?m=article)
- [The Ringer videos](https://www.theringer.com/videos)

Technical standards and framework references:

- [Next.js dynamic metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Next.js static dynamic-route generation](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)
- [Next.js sitemap convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Google Search structured-data overview](https://developers.google.com/search/docs/appearance)
- [Google ProfilePage guidance](https://developers.google.com/search/docs/appearance/structured-data/profile-page)
- [Google video SEO guidance](https://developers.google.com/search/docs/appearance/video)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
