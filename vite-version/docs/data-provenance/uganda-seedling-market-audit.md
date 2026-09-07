# Uganda Seed and Seedling Market Audit

Generated for Phase 2A from the source records under `src/app/shop/data/source-data/uganda/`.

## Sources accessed

- NFA, *Pricelist of Assorted Tree Seedlings*, January 2024, vintage 2023-2024. The official PDF was downloaded and locally extracted. It contributes 51 forestry/agroforestry planting-material observations in this first conservative slice, including named GC/GU clones, provenances, pot sizes, and UGX prices.
- UTGA public website, including its 2026 planting-material article, nursery quality checklist, association/about page, and contact page. These support sector context and source hierarchy, not a nursery operator row or current commercial offer.

## Sources pending

- Uganda 2018 certified seedling nursery register: Scribd page redirected/blocked during retrieval; no rows guessed.
- Uganda 2019/20 certified nursery and clonal operator register: Scribd page redirected/blocked during retrieval; no rows guessed.
- Broader private nursery and business-directory searches remain pending. No unsupported supplier identities were added.

## Observation and inference policy

NFA rows remain observed, with original UGX amount, per-seedling unit, pot-size basis, price-list vintage, seller, and source ID. Current availability is `unknown`; a 2024 price list is not treated as 2026 stock. Named clones GC550, GC796, GC796/2 and GU7 remain distinct observed materials because the source explicitly names them.

No GU-family or GC-family inference was emitted in this slice. Generic species availability does not imply a clone, and a named clone does not by itself establish every nursery's capability.

## Entity resolution

The NFA source is represented as one canonical seller entity: National Forestry Authority Uganda, Namanve Industrial Area. No private nursery entity was merged or invented. No duplicate candidates were asserted without registry rows.

## Price handling

Prices remain UGX and per seedling. Different pot sizes remain separate variants. No 100/500/1,000 bulk prices or discounts were manufactured. The generated shop cards use `quote` and `Verify availability` because the source is a dated price list, not a current inventory feed.

## Coverage report

Run `pnpm report:uganda-market` to regenerate `uganda-seedling-market-report.json` from the raw observations. The report records raw rows, canonical entities, materials, named-clone coverage, district/location coverage, price ranges, pending sources, and limitations.
