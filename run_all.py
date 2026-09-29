"""
run_all.py
----------
Runs the full pipeline end to end.

Data source (choose one):
    python run_all.py                  # REAL Global Superstore dataset (default)
    python run_all.py --dataco         # REAL DataCo Smart Supply Chain dataset
    python run_all.py --synthetic      # synthetic generated dataset
    python run_all.py --skip-build     # reuse the CSVs already in data/

Other options:
    --min-days N    minimum active selling days for a SKU (real data only, default 180)
    --skip-tests    don't run the test suite first
    --quiet         less verbose output

Optional extra analyses (all additive -- OFF by default, and none of them
modify any file the core steps below produce; each writes its own new
output file instead):
    --with-promo         promotion-aware forecasting using the real Discount
                          column (src/promo_forecast.py)
    --with-vlt            re-cost the policy assuming lead time is a random
                          variable, not a constant (src/variable_lead_time_analysis.py)
    --with-backorders     explicit day-by-day backorder simulation instead of
                          the flat lost-sale-fraction assumption (src/backorder_analysis.py)
    --with-frontend-data  export outputs as JSON for the React/shadcn frontend (frontend/)
                          (src/export_json.py) -- see frontend/README or the project README
    --with-extras          shorthand for all three analysis flags above (not --with-frontend-data)

Steps:
    0. tests          -- unit tests (fail fast before a long run)
    1. build data     -- real dataset loader OR synthetic generator
    2. ingest         -- validate, then load into SQLite
    3. clean_eda      -- clean, ABC / XYZ / ABC-XYZ segmentation
    4. forecast       -- per-SKU demand forecasts + backtest
    5. optimize       -- safety stock, reorder point, EOQ, reorder alerts
    6. simulate       -- naive vs. optimized policy + service-level sensitivity
    7. report         -- executive summary markdown
    8+. optional extras, only if requested (see above)
"""

import argparse
import subprocess
import sys
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
SRC_DIR = BASE_DIR / "src"


def run(cmd, description, quiet=False):
    bar = "=" * 64
    print(f"\n{bar}\n  {description}\n{bar}")
    start = time.time()
    result = subprocess.run(cmd, cwd=BASE_DIR)
    elapsed = time.time() - start
    if result.returncode != 0:
        print(f"\n  FAILED: {description} (exit {result.returncode})")
        print("  Pipeline stopped. Fix the error above and re-run.")
        sys.exit(result.returncode)
    if not quiet:
        print(f"  [OK] done in {elapsed:.1f}s")


def main():
    ap = argparse.ArgumentParser(description="Run the inventory optimization pipeline")
    src = ap.add_mutually_exclusive_group()
    src.add_argument("--synthetic", action="store_true", help="use the synthetic data generator")
    src.add_argument("--dataco", action="store_true", help="use the real DataCo Smart Supply Chain dataset")
    src.add_argument("--skip-build", action="store_true", help="reuse existing CSVs in data/")
    ap.add_argument("--min-days", type=int, default=180,
                    help="minimum active selling days per SKU (real data only)")
    ap.add_argument("--skip-tests", action="store_true", help="skip the unit test suite")
    ap.add_argument("--quiet", action="store_true")
    ap.add_argument("--with-promo", action="store_true",
                    help="also run the promotion-aware forecasting analysis (additive, opt-in)")
    ap.add_argument("--with-vlt", action="store_true",
                    help="also run the variable-lead-time policy analysis (additive, opt-in)")
    ap.add_argument("--with-backorders", action="store_true",
                    help="also run the explicit backorder simulation (additive, opt-in)")
    ap.add_argument("--with-frontend-data", action="store_true",
                    help="also export outputs as JSON for the React/shadcn frontend (additive, opt-in)")
    ap.add_argument("--with-extras", action="store_true",
                    help="shorthand for --with-promo --with-vlt --with-backorders")
    args = ap.parse_args()

    py = sys.executable
    t0 = time.time()

    if not args.skip_tests:
        try:
            run([py, "-m", "pytest", "tests/", "-q"], "Running unit tests", args.quiet)
        except FileNotFoundError:
            print("  pytest not installed -- skipping tests")

    if args.skip_build:
        print("\n  [skip] Using existing CSVs in data/")
    elif args.synthetic:
        run([py, str(SRC_DIR / "generate_data.py")], "Generating synthetic dataset", args.quiet)
    elif args.dataco:
        run([py, str(SRC_DIR / "load_dataco_data.py"), "--min-days", str(args.min_days)],
            "Building tables from the REAL DataCo Smart Supply Chain dataset", args.quiet)
    else:
        run([py, str(SRC_DIR / "load_real_data.py"), "--min-days", str(args.min_days)],
            "Building tables from the REAL Global Superstore dataset", args.quiet)

    run([py, str(SRC_DIR / "ingest.py")], "Validating and loading into SQLite", args.quiet)
    run([py, str(SRC_DIR / "clean_eda.py")], "Cleaning data and segmenting the catalogue", args.quiet)
    run([py, str(SRC_DIR / "forecast.py")], "Building demand forecasts", args.quiet)
    run([py, str(SRC_DIR / "optimize.py")], "Computing reorder policy and alerts", args.quiet)
    run([py, str(SRC_DIR / "simulate.py")], "Simulating policies and sweeping service levels", args.quiet)
    run([py, str(SRC_DIR / "report.py")], "Generating executive summary", args.quiet)

    if args.with_promo or args.with_extras:
        run([py, str(SRC_DIR / "promo_forecast.py")],
            "[extra] Promotion-aware forecasting", args.quiet)
    if args.with_vlt or args.with_extras:
        run([py, str(SRC_DIR / "variable_lead_time_analysis.py")],
            "[extra] Variable lead-time policy analysis", args.quiet)
    if args.with_backorders or args.with_extras:
        run([py, str(SRC_DIR / "backorder_analysis.py")],
            "[extra] Explicit backorder simulation", args.quiet)
    if args.with_frontend_data:
        run([py, str(SRC_DIR / "export_json.py")],
            "[extra] Exporting data for the React/shadcn frontend", args.quiet)

    total = time.time() - t0
    print("\n" + "=" * 64)
    print(f"  Pipeline complete in {total:.1f}s. Outputs in outputs/")
    print("  Executive summary : outputs/executive_summary.md")
    print("  Launch frontend   : cd frontend && npm run dev")
    print("=" * 64)


if __name__ == "__main__":
    main()
