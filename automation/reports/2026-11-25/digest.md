# Site steward digest, 25 Nov 2026

Two cards added, both on carbon market infrastructure after COP31. `tsc -b --noEmit` passes.

## Added to the hub

- **Finance & Markets**: "Singapore and Kenya have signed an Article 6 carbon credit agreement, Singapore's 13th". Source: [Government of Singapore newsroom](https://www.meti.gov.sg/newsroom/singapore-signs-13th-implementation-agreement-on-carbon-credits-collaboration-under-article-6-of-the-paris-agreement-with-kenya/). Signed 16 Nov 2026 at COP31. The page confirms the date, the signatories and the "third African partner" count. It does not give project types, an adaptation share or application timing. Grace Fu's signing remarks reportedly point to applications opening in 2027, but I only saw that in a search summary and did not open the page, so it is left out of the card.
- **Finance & Markets**: "Uganda has launched a national register that tracks every carbon project from approval to retirement". Source: [Daily Monitor, 19 Nov 2026](https://www.monitor.co.ug/uganda/news/national/uganda-launches-national-carbon-project-register-at-cop31-5677226). Opened and confirmed (register scope, East African Carbon Company as technical partner, 81 letters of no objection with 71% issued by September). It is a single outlet's report, and the card says so. I found no ministry statement.

Images (both new Commons files; I confirmed credit and licence on the file pages, and both 1920px thumbnails return JPEG data):
- Singapore card: Marina Bay panorama, CEphoto / Uwe Aranas, CC BY-SA 3.0.
- Uganda card: Kampala skyline, Todd Huffman, CC BY 2.0.
Both are city views, not forest scenes. I found no better subject match for registry and treaty news, so swap them if you prefer.

`updatedAt` for Finance & Markets is now "25 Nov 2026".

## Updated

None. No new item contradicted an existing card. The Singapore card sits alongside "Kenya caps overseas carbon sales" (10M tCO2e cap, forests not on the initial priority list) and "Kenya's national carbon registry is now live", and neither needed editing.

## Worth a look

- The Daily Monitor piece mentions a separate COP31 global registry for Article 6.2 transfers. I saw this only in search results, not on a page I opened, so it is unconfirmed.

## Suggestions outside the hub

- **Market Atlas**: add Singapore as a named buyer jurisdiction for Kenya (and Rwanda) Article 6 credits, source the government release above. Wait for project types to be published.
- **Articles**: a piece on what Uganda's register and Kenya's registry mean for developers holding approvals in both countries. Sources: the Daily Monitor article and the existing Kenya registry card.
- None for the seedling catalogue.

## Site health

Medium
- `/models/site-species-analysis` scrolls sideways by 86px on a 390px phone. Likely a fixed-width table or chart without `overflow-x` handling.
- `https://comtrade.un.org/` returns 404 (linked from `/`, `/newsletter`, `/landing`). Probably the site now needs a different UN Comtrade URL (for example `comtradeplus.un.org`); I did not confirm this.
- `https://www.utga.ug/` returns 404 (same three pages). Check whether the Uganda Timber Growers Association has moved domain, or remove the link.

Low
- `/_vercel/insights/script.js` is served as HTML on all 18 pages crawled. Vercel Web Analytics is probably not enabled for the project, or the script tag points at a path that does not exist on this deployment.

## Could not verify

- "Tanzania orders CRDB Bank, NCMC partnership to finance, advance carbon projects" (Daily News, 14 Nov). Only the Google News redirect was available, and I did not find or open the original within this run.
- "Kenya to distribute 6.16 million fruit seedlings in 2027/28". Not opened, and it is marginal for the hub.
- "Tanzania steps up green push with 9bn/- restoration hub launch", "Uganda's Natural Forests Shrink as Agroforestry Strategy Seeks Shs73Bn" and "Forest encroachment worsens around Mt Elgon as govt launches Shs131b restoration drive". All plausible candidates, none opened.
- The Nation article on the Kenya–Singapore deal returned 403, and the QCIntel article is paywalled. The government release was used instead.

## Sources

All 18 feeds and pages in `sources.json` fetched successfully this run. The Google News feeds only give redirect links, so those items needed a separate search to reach the original.
