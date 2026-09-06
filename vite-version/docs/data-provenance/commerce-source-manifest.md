# Commerce Evidence Source Manifest

Phase 1 reserves typed import adapters and does not import new web data. Every adapter must emit raw source facts and source identifiers without replacing observed values with inferred or derived values.

## Reserved adapters

- Uganda NFA seedling price list
- Uganda 2018 certified seedling nursery register
- Uganda 2019/20 certified seedling/clonal nursery register
- Uganda UTGA nursery and service data
- Kenya KFS eNursery
- KEFRI nursery certification and register material
- KEFRI Enterprise seed and seedling catalogue
- Tanzania TFS Tree Seed Production catalogue and stations
- TTGAF common nursery data
- NFA, KFS and TFS land, investment, tender and forest-material opportunities
- KCFIC timber market data
- Processor database
- Other commercial market observations

## Import contract

Adapters must preserve the original amount, currency, unit, basis, price type, date or vintage, entity, product specification, and source IDs. UGX, KES and TZS must remain raw currencies; USD conversion is presentation-only.

Records marked dummy, generated, test, or otherwise explicitly synthetic are quarantined and must not be exported as factual production listings. Locality observations may be retained without coordinates. Coordinates require precision and confidence metadata.

## Inference rules

- Observed facts are immutable and are never overwritten by inference.
- Generic `Eucalyptus grandis` availability does not establish GU clone availability.
- Certified clonal capability may support `Eucalyptus clonal material` as inferred.
- Certified clonal capability plus explicit `E. grandis` and `E. urophylla` may support `GU-family material` as inferred, never a named clone.
- GU7 and GC550 are observed only when a source explicitly names the clone.
- Observed and inferred suppliers are counted separately.
