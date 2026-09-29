# Inventory optimization: executive summary

*Generated 2026-09-22 from 47 planning SKUs across 1,006 days (2.8 years) of real transaction history.*

## The recommendation in one line

Adopting a variability-aware reorder policy cuts stockout days by **56.2%** and delivers an estimated **$62,224 net benefit** over the simulated period, after paying for the additional inventory it requires.

## What was compared

| | Current (naive) policy | Proposed (optimized) policy |
|---|---|---|
| Reorder trigger | Lead-time demand only | Lead-time demand + safety stock |
| Order quantity | Fixed 2 weeks of demand | Economic Order Quantity |
| Stockout days | 4,465 | 1,957 |
| Service level achieved | 90.6% | 95.8% |
| Inventory holding cost | $58,395 | $81,457 |

## The trade-off, stated honestly

The optimized policy is **not free**. It carries more inventory, costing an additional **$23,062** in holding cost. In exchange it avoids an estimated **$85,286** in lost-sale margin by preventing 2,508 stockout days.

Net position: **$62,224**. The case rests on the assumption that roughly 50% of demand during a stockout is genuinely lost rather than deferred. If that figure is materially lower in practice, the case weakens — it should be validated against actual backorder data before rollout.

## Key finding: the service-level target is set too high

Sweeping service-level targets from 90% to 99% shows total cost (holding + lost sales) is minimised at **99%**, not at the 98% typically applied to high-value items. Pushing beyond that point buys fewer stockouts at a price that exceeds the margin it protects.

| Service level | Stockout days | Holding cost | Total cost |
|---|---|---|---|
| 90% | 2,555 | $71,618 | $195,853 |
| 92% | 2,434 | $73,321 | $191,449 |
| 95% | 2,208 | $75,056 | $183,073 |
| 97% | 1,938 | $78,593 | $174,813 |
| 98% | 1,760 | $83,095 | $168,386 |
| 99% | 1,305 | $90,549 | $148,694 **<- lowest** |

## Immediate operational actions

**20 SKUs are at or below their reorder point right now** and need orders placed.

Highest-priority five (largest gap below reorder point):

| SKU | Class | On hand | Reorder point | Suggested order |
|---|---|---|---|---|
| Indoor/Outdoor Games | Europe | A | 0 | 130 | 209 |
| Cleats | Europe | A | 64 | 167 | 179 |
| Men's Footwear | Europe | A | 0 | 50 | 67 |
| Shop By Sport | Europe | C | 9 | 57 | 181 |
| Indoor/Outdoor Games | LATAM | A | 99 | 145 | 220 |

## Where the value is concentrated

Top five SKUs by net benefit:

| SKU | Stockout days avoided | Net $ impact |
|---|---|---|
| Fishing | LATAM | 78 | $7,453 |
| Cardio Equipment | LATAM | 77 | $5,097 |
| Camping & Hiking | LATAM | 74 | $4,466 |
| Men's Footwear | LATAM | 82 | $4,060 |
| Women's Apparel | LATAM | 75 | $3,265 |

Not every SKU benefits. These lose money under the optimized policy — the extra safety stock costs more than the stockouts it prevents, and they should stay on a simple reorder rule:

| SKU | Net $ impact |
|---|---|
| Cleats | USCA | $-464 |
| Fishing | USCA | $-279 |
| Accessories | Pacific Asia | $-225 |

## How to manage the catalogue

ABC (value) crossed with XYZ (predictability) gives a management approach per segment:

| Segment | SKUs | Revenue | Approach |
|---|---|---|---|
| AZ | 23 | $23,272,776 | High value, erratic -- highest risk; hold generous safety stock and review weekly |
| BZ | 9 | $4,583,617 | Mid value, erratic -- buffer with safety stock, avoid over-forecasting |
| CZ | 15 | $1,691,398 | Low value, erratic -- consider make-to-order or delisting |

## Forecasting notes

Model selection across SKUs: {'moving_average': 42, 'croston': 5}. Average error: 1.53 units/day.

Demand is highly intermittent — **72.5%** of all SKU-days have zero sales. This is why Croston's method is selected for a large share of SKUs; conventional smoothing models chase noise on sparse series.

## Caveats

- Supplier lead times are assumed by category; the source data records customer shipping dates, not replenishment lead times.
- Stock-on-hand history is reconstructed by simulating a naive policy against real demand, since the source data contains no inventory levels.
- Demand outliers beyond 5.0 sigma were capped (51 values) so single spikes do not inflate safety stock.
- Lost-sale valuation uses margin, not revenue, and applies the fraction noted above.
