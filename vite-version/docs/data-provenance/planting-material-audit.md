# Planting material audit — 2026-09-11

The current branch was audited before editing. Unrelated local edits to the landing discovery section, roundwood shop, a deleted concessions file, and a backend log were left intact.

## Existing flow

`seedlings.json` → `normalizeSeedlingInventory` / `getNurserySpeciesOffers` → `shopInventoryMap` → `SeedlingsShop` → `ShopCommonLayout` → `ProductGrid` / `EnhancedProductCard` → routed `ProductPage` → `RetailerMapPanel`.

- 19 genetic product entries, species/variety aliases, quantity variants, nursery country and coordinate fields, and a dummy-record exclusion already existed.
- `minimumKnownPrice` accepted zero and non-finite values. Normalization removed quantity controls when a tier had no price and retained an unsupported item-price fallback.
- Priced legacy nursery rows were marked dummy/testing; production nursery rows had no prices. Raw product USD prices and discounts were synthetic catalogue placeholders.
- Cards used `Starting from` only in compact mode, hid quantity controls there, and sorted on the first variant instead of the selected quantity.
- Product headline used the selected nursery price, not a minimum; it defaulted to the first variety, assumed the item's currency for all nurseries, omitted country filtering, and discarded unmapped suppliers.
- `Number(null)` became zero for nursery coordinates. The catchment radius was around a nursery, not the user.
- `ImageCarouselBasic` already supported thumbnails, swipe and lightbox. Its default `contain` fit caused letterboxing; images lacked provenance.
- Seedling descriptions/banners asserted stock/new releases without current inventory evidence.

## Implementation decisions

- Retain `/shop/seedlings` and every existing product slug. Use `?material=seed` for the seed view.
- Common supplier, evidence, quote, selection, filtering and distance types; discriminated seed-specific technical fields.
- Retain original quotes; never compare unlike units or currencies. Bulk seedling estimates are explicitly inferred; historical or unknown-unit prices cannot enter headline minima.
- Keep suppliers without coordinates in the list. Map only valid points and disclose approximate coordinate provenance.
- Explicit geolocation CTA with in-memory coordinates; no native permission request on render and no persistent precise location storage.
- Reuse the existing cards, gallery, map primitives, typography and responsive product-page structure.

Research ledger, ingestion snapshots, validation and final coverage are recorded alongside the implementation.
