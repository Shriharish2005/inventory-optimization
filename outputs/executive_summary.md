# Inventory optimization: executive summary

*Generated 2026-09-29 from 85 planning SKUs across 1,461 days (4.0 years) of real transaction history.*

## The recommendation in one line

Adopting a variability-aware reorder policy cuts stockout days by **92.6%** and delivers an estimated **$10,474 net benefit** over the simulated period, after paying for the additional inventory it requires.

## What was compared

| | Current (naive) policy | Proposed (optimized) policy |
|---|---|---|
| Reorder trigger | Lead-time demand only | Lead-time demand + safety stock |
| Order quantity | Fixed 2 weeks of demand | Economic Order Quantity |
| Stockout days | 7,584 | 564 |
| Service level achieved | 93.9% | 99.5% |
| Inventory holding cost | $14,257 | $47,012 |

## The trade-off, stated honestly

The optimized policy is **not free**. It carries more inventory, costing an additional **$32,755** in holding cost. In exchange it avoids an estimated **$43,229** in lost-sale margin by preventing 7,020 stockout days.

Net position: **$10,474**. The case rests on the assumption that roughly 50% of demand during a stockout is genuinely lost rather than deferred. If that figure is materially lower in practice, the case weakens — it should be validated against actual backorder data before rollout.

## Key finding: the service-level target is set too high

Sweeping service-level targets from 90% to 99% shows total cost (holding + lost sales) is minimised at **92%**, not at the 98% typically applied to high-value items. Pushing beyond that point buys fewer stockouts at a price that exceeds the margin it protects.

| Service level | Stockout days | Holding cost | Total cost |
|---|---|---|---|
| 90% | 986 | $40,750 | $49,859 |
| 92% | 858 | $41,773 | $49,722 **<- lowest** |
| 95% | 665 | $44,150 | $50,379 |
| 97% | 540 | $46,100 | $51,292 |
| 98% | 425 | $47,744 | $51,996 |
| 99% | 314 | $50,472 | $53,474 |

## Immediate operational actions

**76 SKUs are at or below their reorder point right now** and need orders placed.

Highest-priority five (largest gap below reorder point):

| SKU | Class | On hand | Reorder point | Suggested order |
|---|---|---|---|---|
| Chairs | US | A | 0 | 47 | 50 |
| Phones | US | A | 0 | 47 | 58 |
| Bookcases | APAC | A | 0 | 47 | 41 |
| Bookcases | LATAM | A | 4 | 47 | 52 |
| Furnishings | US | B | 17 | 58 | 148 |

## Where the value is concentrated

Top five SKUs by net benefit:

| SKU | Stockout days avoided | Net $ impact |
|---|---|---|
| Copiers | APAC | 126 | $2,246 |
| Phones | APAC | 94 | $1,419 |
| Paper | US | 99 | $997 |
| Accessories | US | 108 | $994 |
| Chairs | APAC | 90 | $891 |

Not every SKU benefits. These lose money under the optimized policy — the extra safety stock costs more than the stockouts it prevents, and they should stay on a simple reorder rule:

| SKU | Net $ impact |
|---|---|
| Tables | US | $-587 |
| Phones | EMEA | $-570 |
| Bookcases | US | $-537 |

## How to manage the catalogue

ABC (value) crossed with XYZ (predictability) gives a management approach per segment:

| Segment | SKUs | Revenue | Approach |
|---|---|---|---|
| AY | 26 | $7,661,171 | High value, moderately variable -- forecast closely, review monthly |
| BY | 17 | $1,227,647 | Mid value, variable -- standard reorder policy |
| AZ | 7 | $1,199,020 | High value, erratic -- highest risk; hold generous safety stock and review weekly |
| BZ | 7 | $487,392 | Mid value, erratic -- buffer with safety stock, avoid over-forecasting |
| CY | 16 | $445,109 | Low value, variable -- simple rule, accept occasional stockouts |
| CZ | 12 | $137,242 | Low value, erratic -- consider make-to-order or delisting |

## Forecasting notes

Model selection across SKUs: {'moving_average': 51, 'croston': 34}. Average error: 2.79 units/day.

Demand is highly intermittent — **72.9%** of all SKU-days have zero sales. This is why Croston's method is selected for a large share of SKUs; conventional smoothing models chase noise on sparse series.

## Caveats

- Supplier lead times are assumed by category; the source data records customer shipping dates, not replenishment lead times.
- Stock-on-hand history is reconstructed by simulating a naive policy against real demand, since the source data contains no inventory levels.
- Demand outliers beyond 5.0 sigma were capped (669 values) so single spikes do not inflate safety stock.
- Lost-sale valuation uses margin, not revenue, and applies the fraction noted above.
