# EA Forests design guardrails

This file records the design decisions the live site (eaforests.com) is committed to.
People and bots that propose changes check against it. The values come from
`vite-version/src/index.css` and the Information Hub data files as of November 2026.
If the code and this file disagree, the code wins and this file should be updated.

## Identity

- **Tone:** an editorial forestry-intelligence publication, not a SaaS dashboard.
  Calm, evidence-led and specific. No hype, emoji or exclamation marks.
- **Typeface:** Archivo (variable width and weight) for everything, via `--font-canals`.
  Do not introduce a second display face.
- **Corners:** square. Every radius token is `0`. Never add rounded cards, pills or buttons.
- **Palette:** one green family at OKLCH hue 155.
  - Background `oklch(0.975 0.022 155)`, card `oklch(0.99 0.012 155)`
  - Foreground and text `oklch(0.27 0.07 155)`, primary `oklch(0.34 0.1 155)`
  - Muted surfaces `oklch(0.94 0.035 155)`, borders `oklch(0.86 0.045 155)`
  - Information Hub topics each have one accent (for example `#e96e65` for Policy & Regulation).
    Accents mark the topic. They are not used as page backgrounds.
- Use the existing tokens and components. A content change never needs new CSS.

## Content rules (the Information Hub and articles)

Hub content lives in `vite-version/src/app/information/data.ts`, with one photo per card
in `vite-version/src/app/information/card-images.ts`.

- **Every claim has a source.** Each card has a `publisher`, a `publishedAt` date
  (`"26 Jun 2026"` format) and an `href` to the primary source. Prefer the official
  document or the original reporting over an aggregator. Never link to a Google News
  redirect URL.
- **Summaries say what changed, for whom, and what is still unknown.** Two to five plain
  sentences with the specific figure, date, country and instrument. Separate fact from
  inference ("How KRA will treat panels from Uganda or Tanzania is untested.").
- **Titles are claims, not labels.** "Kenya's new 30% excise on imported wood panels has no
  EAC exemption", not "Kenya Finance Act update".
- **`signal`** is a two-to-four-word state ("Panel excise live").
- **`kind`** is one of `news`, `official`, `data`, `analysis` or `timeline`. Use `official`
  only for government, regulator or registry sources.
- **`id`** is a unique kebab-case slug. It keys the card's image.
- **Images:** one unique, subject-matched, freely licensed Wikimedia Commons photo per card,
  at least 1600px wide, served as the 1920px Commons thumbnail. Record `credit`, `license` and
  the Commons file page in `card-images.ts`. Never hotlink images from news sites. They stop
  loading, and the rights are unclear.
- **Stats** (`HubStat`) need a source `href` and a `context` line that says where the
  number comes from and what it does not cover.
- When a topic gets new cards, update its `updatedAt`.
- Spelling is British English.

## What automated proposals may change

| Area | Bots may | Bots may not |
|---|---|---|
| Information Hub cards and stats | Add, correct, or mark as superseded | Delete a card without saying why in the PR |
| `card-images.ts` | Add an entry for a new card | Reuse another card's image |
| Articles (`articles/data.ts`) | Suggest topics in the digest only | Write or publish articles |
| Market data (`shop/data/**`) | Suggest additions in the digest, with sources | Edit them directly |
| Components, CSS, layout, routes | Report problems in the digest | Change them |

All bot changes arrive as **draft pull requests** for a person to review. Nothing merges
automatically.
