# Processor-to-Forest Price Bridge

**Status:** analytical reference v0.1  
**Model basis:** `EA-Forests` main at `0d9d43b897741bb53ca56f297c6e8c14dee4ca38`  
**Primary unit:** UGX per delivered tonne  
**Purpose:** explain how a processor's delivered-roundwood payment can be decomposed into direct harvest-and-haul costs, operator remuneration, and the residual value reaching the forest asset.

## 1. Accounting identity

This bridge follows the standard stumpage-appraisal identity used by FAO:

> Selling price = operating cost + profit allowance + stumpage value.

Therefore:

`Forest asset / stumpage value = processor selling price - direct operating cost - operator profit allowance`

This distinction matters for the current roundwood model. `roundwood_production.py` currently reports `profit_usd = processor revenue - H&H costs`. Under the operator/asset business model, that quantity should not automatically be interpreted as operator profit. It is the **economic envelope available to remunerate the operator and pay the forest asset**.

## 2. Model inputs used for the first bridge

The illustration intentionally uses existing `EA-Forests` assumptions rather than introducing a new market-price dataset.

### Processor price

Standard eucalyptus buyer specification embedded in the current roundwood model:

- G1: UGX 125,000/t
- G2: UGX 115,000/t
- G3: UGX 105,000/t
- Reject: UGX 0/t

The model converts UGX to USD internally at UGX 3,700/USD. With the default stand distribution and grade thresholds, the simulated weighted processor price is approximately **UGX 123,829/t**.

### Stand / harvest block

- Aggregated harvest area: 10 ha
- Stems: 545/ha
- Mean DBH: 35 cm; SD 5 cm
- Mean height: 10 m; SD 3 m
- Mean density: 0.70 t/m3; SD 0.05
- Form factor: 0.45
- Grade losses: 10% for G1-G3
- Felling: chainsaw
- Extraction: tractor
- Loading: manual
- Equipment: rented
- Forest-to-aggregation-node distance: 7 km
- Payload: 8 m3 forest-to-node; 12 m3 node-to-factory
- Wage, price and productivity controls: midpoint of model ranges

A 10 ha block is used because unit costs largely stabilise by this scale under the model's integer equipment-day/trip logic. A 1 ha job carries materially higher per-tonne costs from indivisible truck/equipment days.

### Operator remuneration

Base operator remuneration is assumed at **10% of direct H&H cost**.

This is not presented as an observed Uganda contract rate. It is a conservative analytical allowance inside the FAO-reported broad range for contractor profit percentages (about 5%-30% depending on competition and business conditions). It should be replaced by observed operator quotes / contracts when available.

## 3. Base bridge

Base case: 10 ha aggregated eucalyptus harvest, 7 km forest-to-node plus 40 km node-to-factory.

| Component | UGX/t | Share of processor spend |
|---|---:|---:|
| Forest asset / stumpage residual | 41,251 | 33.3% |
| Operator margin (10% of direct H&H) | 7,507 | 6.1% |
| Mensuration | 389 | 0.3% |
| Felling | 2,426 | 2.0% |
| Extraction | 10,443 | 8.4% |
| Loading | 2,644 | 2.1% |
| Haulage | 58,061 | 46.9% |
| Regulatory & admin | 192 | 0.2% |
| Miscellaneous | 917 | 0.7% |
| **Processor payment** | **123,829** | **100.0%** |

Direct H&H totals approximately **UGX 75,071/t (60.6% of processor spend)**. Haulage is the dominant component, at approximately **UGX 58,061/t**.

## 4. Distance sensitivity

All assumptions remain fixed except the aggregation-node-to-factory leg.

| Scenario | Node-to-factory | Processor payment | Direct H&H | Operator margin | Forest asset | Asset share |
|---|---:|---:|---:|---:|---:|---:|
| Near | 20 km | 123,829 | 69,116 | 6,912 | 47,802 | 38.6% |
| **Base** | **40 km** | **123,829** | **75,071** | **7,507** | **41,251** | **33.3%** |
| Far | 80 km | 123,829 | 86,983 | 8,698 | 28,148 | 22.7% |

The implication is structural: the operator cannot create forest-asset value merely by inserting itself into the transaction. It must reduce logistics/coordination costs, obtain a better processor price, improve utilisation/load factors, increase recovery/grade, or combine these mechanisms.

## 5. Scale check

At the same 40 km node-to-factory distance and 10% operator markup:

| Harvest block | Direct H&H UGX/t | Forest asset UGX/t | Asset share |
|---|---:|---:|---:|
| 1 ha | 80,914 | 34,845 | 28.1% |
| 5 ha | 75,738 | 40,458 | 32.7% |
| 10 ha | 75,071 | 41,251 | 33.3% |
| 20 ha | 74,777 | 41,530 | 33.6% |

This suggests the current cost library captures a modest aggregation benefit, but most of the remaining value leakage is transport rather than small-job overhead once roughly 10 ha is aggregated.

## 6. External evidence cross-check

The structure is consistent with FAO guidance and case studies:

1. FAO forestry financial guidance recommends decomposing operations into labour, equipment, materials, supervision/overheads and transport, then adding an explicit profit allowance. It also gives the stumpage equation used above.
2. FAO Harvesting Case Study 18 found first transport accounted for **38%-84% of total logging/first-transport unit cost** across five operators, followed by loading and extraction; felling/crosscutting was comparatively small.
3. A FAO review of Fiji roundwood production similarly found road transport was the largest single component of delivered roundwood production cost in that case.
4. FAO's planted-forest guidance treats establishment, tending and monitoring as long-term forest-asset investment costs. These should therefore be assessed in the plantation DCF / silviculture model, not double-counted as same-period deductions from the processor procurement price bridge.

## 7. Interpretation rules

- **Forest asset residual is stumpage/gross asset receipt, not net asset profit.** The plantation still has historical establishment, maintenance, land/capital and risk costs over the rotation.
- **Do not add full silviculture costs to this transaction bar.** Those costs occur over multiple years and need levelisation/DCF treatment before comparing them with final-harvest stumpage.
- **Processor prices are model inputs, not independently verified current contracts.** They should be replaced or weighted by observed processor transactions as evidence improves.
- **Operator margin is explicit, not hidden inside H&H.** This keeps direct production economics separate from the operator business model.
- **Distance, payload, equipment utilisation and aggregation scale are first-order sensitivities.** Do not present a single stumpage number without these assumptions.
- **Current `profit_usd` should not be relabelled globally.** It remains valid for a vertically integrated owner-operator case. The operator/asset model needs an additional bridge output rather than a destructive semantic change.

## 8. Recommended model extension

Add a non-breaking `processor_to_asset_bridge` output to the roundwood service with:

- `processor_gross_revenue`
- `direct_hh_cost`
- task-level H&H breakdown
- `operator_markup_pct` and `operator_margin`
- `forest_asset_residual`
- per-tonne and percentage-of-processor-spend views
- distance / aggregation / price / operator-margin sensitivities
- source metadata for every processor price and contractor-cost assumption

Do **not** hard-code 10% as a fact. Keep it an explicit scenario control until observed contracts calibrate the distribution.

## 9. Sources

- FAO, *Guidelines for defining financial, economic, environmental and social information*: https://www.fao.org/4/w8212e/w8212e06.htm
- FAO, *Forest Harvesting Case Study 18*: https://www.fao.org/4/Y3061E/y3061e07.htm
- FAO, *A Review of the Forest Revenue System and Taxation of the Forestry Sector in Fiji*: https://www.fao.org/4/af168e/af168e06.htm
- FAO Sustainable Forest Management Toolbox, *Management of planted forests*: https://www.fao.org/sustainable-forest-management-toolbox/modules/management-of-planted-forests/1/en?tabInx=1

## 10. Evidence still required before investment-grade use

- observed processor purchase invoices / contracts by species, grade, location and delivery basis;
- contractor quotes or time-and-motion evidence for felling, extraction, loading and haulage in the target geography;
- truck payload, utilisation, backhaul and road-condition evidence;
- explicit operator commercial terms (markup, fixed fee, per-tonne fee, revenue share or hybrid);
- forest-owner stumpage/farmgate transactions;
- calibration of the silviculture DCF so the residual stumpage can be translated into asset IRR / NPV rather than treated as asset profit.
