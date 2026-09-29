# Supply chain inventory optimization

Demand forecasting and reorder-point optimization on **real retail transaction data** —
from raw transactions through forecasting, policy design, and simulation, to a
quantified dollar impact and an operational reorder action list.

Built on the [Global Superstore dataset](https://raw.githubusercontent.com/dijendersaini/TimeSeriesAnalysis/master/Global%20Superstore.csv):
**51,290 real transactions**, 2011–2014, across 147 countries and $11.2M in revenue.

---

## The problem

Retailers lose money two ways: **stockouts** (lost sales) and **overstock** (tied-up cash
and holding costs). Most teams set reorder points with rules of thumb that ignore demand
variability. This project builds a forecasting and reorder-policy pipeline, then measures
what a variability-aware policy is actually worth — including what it costs.

## Headline results

| Metric | Naive policy | Optimized policy |
|---|---|---|
| Stockout days (85 SKUs × 4 years) | 7,584 | 564 |
| Reduction | — | **92.6%** |
| Service level achieved | 93.9% | 99.5% |
| Inventory holding cost | $14,257 | $47,012 |
| Estimated lost-sale margin avoided | — | **$43,229** |
| **Net impact** | — | **+$10,474** |

**The honest trade-off:** the optimized policy is not free. It carries substantially more
inventory, costing an extra $32,755. It earns that back by preventing 7,020 stockout days
worth roughly $43,229 in protected margin — a positive but not overwhelming net position,
and one that depends on the assumption that ~50% of demand during a stockout is genuinely
lost rather than deferred.

**Key finding:** sweeping service-level targets from 90% to 99% shows total cost is
minimised at **92%**, *not* the 98% typically applied to high-value items. Beyond that
point, additional safety stock costs more than the margin it protects. This is the kind of
result that changes a policy decision rather than just describing the data.

---

## What's in the pipeline

```
Raw transactions (51,290 real records)
        ↓  load_real_data.py    aggregate to planning grain, derive unit economics
Three-table schema (sku_dim, sales_fact, inventory_snapshot)
        ↓  ingest.py             validate schema + sanity checks, load to SQLite
SQLite database
        ↓  clean_eda.py          dedupe, outlier capping, ABC / XYZ / ABC-XYZ segmentation
Cleaned + segmented catalogue
        ↓  forecast.py           per-SKU backtested model selection (parallel)
Demand forecasts
        ↓  optimize.py           safety stock, reorder point, EOQ, live reorder alerts
Inventory policy
        ↓  simulate.py           naive vs. optimized (s,Q) simulation + service-level sweep
Quantified impact
        ↓  report.py             stakeholder-facing executive summary
Executive summary + React frontend
```

## Features

**Data & quality**
- Real 51K-transaction dataset with a documented transformation to planning grain
- Schema validation with actionable error messages before anything loads
- Data-quality reporting: duplicates, negatives, outlier capping, intermittency profiling
- Synthetic data generator retained as an alternative source (`--synthetic`)

**Analytics**
- ABC classification (value) + XYZ classification (predictability) + 9-box ABC-XYZ segmentation
  with a recommended management approach per segment
- Automatic model selection per SKU: moving average, Holt-Winters, or **Croston's method**
  for intermittent demand — essential here, since 72.9% of SKU-days have zero sales
- Parallel forecasting across SKUs

**Optimization**
- Safety stock, reorder point, and EOQ with service levels tuned by ABC class
- (s, Q) simulation reordering off *inventory position* (on-hand + on-order)
- Service-level sensitivity sweep to find the cost-minimising target
- Live reorder alerts: RED / YELLOW / GREEN with days-of-cover and suggested order quantity

**Delivery**
- Seven-view React dashboard (`frontend/`): Overview, Order now, Catalogue, Geography,
  Forecasts, Policy, and What-if. Dynamic filters for Category, Market, and ABC class,
  searchable countries, and a client-side what-if simulator
- **Light/dark mode toggle** with custom design tokens
- Auto-generated executive summary in Markdown
- 53 unit tests covering the policy math, simulation engine, validation, forecasting, and the
  variable-lead-time / backorder / promo-regression extensions below

---

## Quick start

Requires Python 3.9+.

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the full pipeline and generate frontend data bundle (~15 seconds)
python run_all.py --with-frontend-data

# 3. Launch the frontend
cd frontend
npm install
npm run dev
# -> open http://localhost:5173
```

The repo ships with pre-generated outputs, so you can skip straight to step 3 to launch the frontend.

### Other run modes

```bash
python run_all.py --synthetic       # use the synthetic generator instead of real data
python run_all.py --skip-build      # reuse the CSVs already in data/
python run_all.py --min-days 300    # stricter SKU density filter (real data)
python run_all.py --skip-tests      # skip the unit tests
python run_all.py --with-extras     # also run the three optional analyses (see below)
python -m pytest tests/ -v          # run tests on their own
```

### Run it in Docker instead

```bash
# Re-run pipeline and data export
docker compose run pipeline

# Or run the React frontend via Docker
docker compose up frontend
# -> open http://localhost:3000

# Run unit tests
docker compose run tests
```

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs the full test suite, a complete
pipeline execution, a frontend data bundle check, and the synthetic-data path on every push,
across Python 3.10–3.12.

### Configuration

All tunable parameters live in `src/common/config.py` and can be overridden with
environment variables — no code changes needed:

```bash
INVOPT_DEFAULT_SERVICE_LEVEL=0.97 INVOPT_TEST_DAYS=90 python run_all.py
```

---

## React/shadcn frontend

`frontend/` is a modern, responsive UI built on React 19 + Vite + TypeScript + Tailwind v4 +
shadcn/ui. It reads the pipeline outputs via a static JSON export generated by `export_json.py`
(`python run_all.py --with-frontend-data`), running as a high-performance client-side SPA.

```bash
python run_all.py --with-frontend-data   # export outputs/*.csv → frontend/src/data/*.json
cd frontend
npm install
npm run dev        # http://localhost:5173, hot-reload
npm run build       # production build (frontend/dist/)
```

**Views**: Overview, Order Now, Catalogue, Geography, Forecasts, Policy, and What-if —
reachable from the "Inventory Planning" section in the sidebar.

**Architecture notes:**
- `src/export_json.py` (new, additive) is the only bridge between the two UIs — the Python
  pipeline is completely unaware the frontend exists.
- The What-if view's policy math (`frontend/src/lib/inventory/policy.ts`) is a TypeScript port of
  `common/policy.py`'s `compute_policy()`, **numerically verified** against the Python
  implementation across multiple inputs (including real dataset values) before being used.
- Geography does not render an actual world map — adding a mapping library (e.g.
  `react-simple-maps` + a topojson atlas, typically 500KB+) for one chart didn't seem worth the
  dependency weight. The same information is shown via sortable bar charts and a full data table
  instead.
- **Lint is not currently working** for the frontend — the template ships `eslint: "latest"`
  (resolves to ESLint 10) together with a legacy `.eslintrc.cjs`, which ESLint 9+ no longer
  reads, and the plugin packages the config references aren't installed either. This is a
  pre-existing gap in the template, not something introduced here. `npx tsc --noEmit` is the
  verification gate that's actually in use, and it's strict (`strict: true`,
  `noUnusedLocals`, `noUnusedParameters`) — every view in `src/views/dashboards/inventory/`
  passes it cleanly. Fixing lint would mean adding several new dependencies to migrate to flat
  config; worth doing if you plan to keep developing the frontend, not done here to avoid
  expanding the dependency footprint for a secondary tool.
- Deployment: `frontend/Dockerfile` (already part of the template, untouched) builds a static
  bundle and serves it via nginx — a separate container from the Python pipeline.

---

## Project structure

```
inventory-optimization/
├── data/
│   ├── raw/global_superstore.csv    # real source dataset (51,290 transactions)
│   ├── sku_dim.csv                   # generated: SKU master + unit economics
│   ├── sales_fact.csv                # generated: daily demand
│   └── inventory_snapshot.csv        # generated: stock-on-hand history
├── src/
│   ├── common/                       # shared core, imported everywhere
│   │   ├── config.py                 #   paths + tunable parameters
│   │   ├── logging_utils.py          #   consistent leveled logging
│   │   ├── validation.py             #   schema + sanity checks
│   │   ├── policy.py                 #   EOQ / safety stock / (s,Q) simulation +
│   │   │                             #   variable-lead-time policy + backorder simulation
│   │   └── forecasting.py            #   MA / Holt-Winters / Croston + promo regression
│   ├── load_real_data.py             # real dataset → pipeline schema
│   ├── generate_data.py              # synthetic alternative
│   ├── ingest.py, clean_eda.py, forecast.py, optimize.py, simulate.py, report.py
│   ├── promo_forecast.py             # [extra] promotion-aware forecasting
│   ├── variable_lead_time_analysis.py # [extra] lead-time-as-distribution policy
│   ├── backorder_analysis.py         # [extra] explicit backorder simulation
│   └── export_json.py                # [extra] JSON export for the React frontend
├── frontend/                          # React/shadcn UI
│   ├── src/views/dashboards/inventory/  # inventory planning views
│   ├── src/lib/inventory/               # data loader, TS policy port, markdown renderer
│   ├── src/data/                        # generated JSON (from export_json.py)
│   └── Dockerfile, nginx.conf           # static build served via nginx
├── tests/                            # 53 unit tests
├── outputs/                          # CSVs, charts, executive summary
├── .github/workflows/ci.yml          # tests + pipeline + frontend verification on push
├── Dockerfile, docker-compose.yml, .dockerignore
├── run_all.py                        # orchestrator (--with-frontend-data)
└── requirements.txt
```

The policy math lives in `src/common/policy.py` and is imported by the
pipeline, exported to the frontend data bundle, and tested by unit tests — so formulas
cannot drift between them.

---

## Methodology

- **Safety stock** = z(service level) × σ(daily demand) × √(lead time)
- **Reorder point** = (avg daily demand × lead time) + safety stock
- **EOQ** = √(2 × annual demand × order cost ÷ holding cost per unit)
- The simulation reorders off **inventory position** (on-hand + on-order), not on-hand alone.
  For fast movers whose reorder cycle is shorter than the supplier lead time, a
  single-order-at-a-time policy is infeasible and would understate real practice.
- **XYZ classification uses weekly buckets.** Daily demand in real retail is so intermittent
  that every SKU's daily coefficient of variation is inflated, making the classification
  meaningless. Safety stock still uses daily sigma; only the predictability label is weekly.
- Service levels are tuned by ABC class rather than applied uniformly.

## Working with real data: three documented assumptions

Real transactional data is not inventory-planning data. Three gaps had to be closed, and
each is a stated assumption rather than a number chosen to flatter the result:

1. **Planning grain.** Individual products sell on a handful of days across four years — far
   too sparse for daily forecasting. Planning happens at the Sub-Category × Market grain
   (e.g. "Binders | EU"), which is how replenishment planning actually works. 119 candidate
   SKUs, 85 retained after a 180-active-day density filter.
2. **Supplier lead times.** The dataset records *customer shipping* dates, not *supplier
   replenishment* lead times. Lead times are assigned per category from documented
   assumptions in `config.py`.
3. **Stock on hand.** The dataset contains no inventory levels. History is reconstructed by
   simulating a naive reorder policy against the real observed demand — which is exactly the
   "before" state the optimized policy is measured against.

Unit cost is derived from the real Sales and Profit columns, so margins reflect actual
transaction economics rather than a guess.

## Alternative real dataset: DataCo Smart Supply Chain

A second real dataset is supported as a drop-in alternative to Global Superstore:
[DataCo Smart Supply Chain for Big Data Analysis](https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis)
(also on [Mendeley Data](https://data.mendeley.com/datasets/8gx2fvg2k6)) — **180,508 real
transactions**, Jan 2015–Oct 2017, across 5 markets and 11 departments / 50 product categories,
$36.8M in transacted revenue.

```
python run_all.py --dataco               # build + run the full pipeline on DataCo
python src/load_dataco_data.py            # just rebuild the three CSVs from the raw file
```

The CSV (~96 MB) isn't checked into this repo — download it from Kaggle or Mendeley and place
it at `data/raw/dataco_supply_chain.csv` before running.

**Why this dataset specifically:** it closes the biggest gap in the Global Superstore loader.
Superstore only records *customer shipping* dates, so `load_real_data.py` has to **assume**
supplier lead times per category. DataCo additionally records `Days for shipment (scheduled)`
and `Days for shipping (real)` on every order — an actual promised-vs-observed delivery
window. `load_dataco_data.py` reads this as a proxy for supplier replenishment lead time and
derives both the **mean and standard deviation of lead time per SKU from the data itself**,
rather than assuming it (see `sku_dim.csv`'s `lead_time_days` / `lead_time_std_days` columns).

Everything else follows the same documented-assumption pattern as the Superstore loader:
planning grain is Category Name × Market (162 candidate SKUs, 47 retained at the default
180-active-day threshold, over a shorter 2.8-year history than Superstore's 4 years);
stock-on-hand is reconstructed the same way, by simulating a naive policy against real
demand; order cost and holding-cost % are still business assumptions, assigned per
department in `config.py`, since no transactional dataset records actual procurement or
warehousing cost. Orders with status `CANCELED` or `SUSPECTED_FRAUD` are dropped before
aggregation, since they were never actually fulfilled.

## Using your own data

Replace the three CSVs in `data/` and run `python run_all.py --skip-build`.

| File | Required columns |
|---|---|
| `sku_dim.csv` | `sku_id, category, unit_cost, unit_price, lead_time_days, order_cost, holding_cost_pct` |
| `sales_fact.csv` | `date, sku_id, qty_sold, revenue` |
| `inventory_snapshot.csv` | `date, sku_id, stock_on_hand` |

Validation will tell you specifically what's wrong if a column is missing or values look implausible.

## Optional extra analyses

Four additive extensions, all OFF by default and none of which modify any core pipeline
output. Each writes its own new file; the original outputs (`inventory_policy.csv`,
`simulation_summary.csv`, `forecast_accuracy.csv`, ...) are never touched.

```bash
python run_all.py --with-extras          # run all three analyses below
python run_all.py --with-promo           # or individually:
python run_all.py --with-vlt
python run_all.py --with-backorders
```

| Extension | Question it answers | Output | Real finding on this dataset |
|---|---|---|---|
| **Promotion-aware forecasting** (`src/promo_forecast.py`) | How much would forecast accuracy improve if a promo calendar were known in advance? Uses the real `Discount` column — present in the source data, unused by the base pipeline. | `promo_forecast_accuracy.csv` | Beats the base model for 89% of SKUs when the discount schedule is known; every 10 points of discount is worth roughly +1 unit/day of demand on average |
| **Variable lead time** (`src/variable_lead_time_analysis.py`) | What if supplier lead time is modelled as a distribution, not a constant? | `inventory_policy_variable_lt.csv` | Safety stock requirements rise ~8%, annual cost ~3%, once lead-time variability is modelled instead of assumed away |
| **Explicit backorders** (`src/backorder_analysis.py`) | What if unmet demand is tracked day-by-day (backordered and recovered, or genuinely lost) instead of using one flat lost-sale rate for every stockout? | `backorder_simulation_results.csv`, `backorder_simulation_summary.csv` | The base pipeline's flat 50% assumption *understates* the lost-sale cost by roughly $9,800 relative to the more granular model on this catalogue |
| **Policy math** (`src/common/policy.py`) | `compute_policy_variable_lead_time()` and `run_sQ_simulation_with_backorders()` are the underlying functions the two analyses above call — usable directly for a custom analysis. Each has full unit test coverage (`tests/test_policy.py`). | — | — |

These exist because the base pipeline's two most consequential assumptions — a flat lost-sale
rate and a constant lead time — are exactly the ones the original "Known limitations" section
below used to flag as unvalidated. Rather than just re-stating them as caveats, these are the
actual sensitivity analyses that quantify what each assumption is worth.

## Known limitations

- Lost-sale valuation assumes 50% of stockout-day demand is genuinely lost. **`--with-backorders`
  replaces this with an explicit day-by-day model** — see above — but the base pipeline's flat
  rate is still what drives the default dollar figures throughout the dashboard and report.
- Lead times are category-level assumptions, not measured supplier performance, and are treated
  as constant rather than variable by default. **`--with-vlt` models lead-time variability
  directly** — see above.
- The service-level sweep optimises total cost but does not model competitive or
  customer-lifetime effects of poor availability, which would push the optimal level higher.
- The promotion-aware forecast (`--with-promo`) measures the value of *knowing* a discount
  schedule in advance; it does not mean the base pipeline currently has access to one.
