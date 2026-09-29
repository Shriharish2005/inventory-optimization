"""
Unit tests for the inventory policy math and simulation engine.

Run with:
    python -m pytest tests/ -v
    python tests/test_policy.py     (works without pytest installed)
"""

# pyright: reportMissingImports=false

import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

try:
    from common.policy import (  # type: ignore
        compute_policy, run_sQ_simulation, reorder_status,
        compute_policy_variable_lead_time, run_sQ_simulation_with_backorders, sample_lead_time,
    )
except ImportError:
    from src.common.policy import (  # type: ignore
        compute_policy, run_sQ_simulation, reorder_status,
        compute_policy_variable_lead_time, run_sQ_simulation_with_backorders, sample_lead_time,
    )


# ---------------- compute_policy ----------------

def test_eoq_matches_closed_form():
    """EOQ should match the textbook formula sqrt(2DS/H)."""
    p = compute_policy(
        avg_daily_demand=10, std_daily_demand=2, lead_time_days=5,
        unit_cost=20, order_cost=50, holding_cost_pct=0.25, service_level=0.95,
    )
    annual_demand = 10 * 365
    holding_per_unit = 20 * 0.25
    expected = np.sqrt(2 * annual_demand * 50 / holding_per_unit)
    assert abs(p.eoq - round(expected, 0)) <= 1


def test_higher_service_level_increases_safety_stock():
    """A stricter service-level target must require more safety stock."""
    low = compute_policy(10, 3, 7, 20, 50, 0.25, service_level=0.90)
    high = compute_policy(10, 3, 7, 20, 50, 0.25, service_level=0.99)
    assert high.safety_stock > low.safety_stock


def test_zero_variability_gives_zero_safety_stock():
    """With perfectly predictable demand there is nothing to buffer against."""
    p = compute_policy(10, 0, 7, 20, 50, 0.25, service_level=0.95)
    assert p.safety_stock == 0


def test_safety_stock_scales_with_sqrt_lead_time():
    """Safety stock should scale with the square root of lead time, not linearly."""
    p1 = compute_policy(10, 5, 4, 20, 50, 0.25, 0.95)
    p2 = compute_policy(10, 5, 16, 20, 50, 0.25, 0.95)
    # 4x the lead time -> 2x the safety stock
    assert abs(p2.safety_stock / p1.safety_stock - 2.0) < 0.05


def test_reorder_point_includes_lead_time_demand():
    p = compute_policy(10, 0, 7, 20, 50, 0.25, 0.95)
    assert abs(p.reorder_point - 70) < 0.01  # 10/day * 7 days, no safety stock


def test_invalid_inputs_raise():
    with pytest.raises(ValueError):
        compute_policy(10, 2, 0, 20, 50, 0.25, 0.95)        # zero lead time
    with pytest.raises(ValueError):
        compute_policy(10, 2, 5, 20, 50, 0.25, 1.5)          # service level > 1
    with pytest.raises(ValueError):
        compute_policy(-1, 2, 5, 20, 50, 0.25, 0.95)         # negative demand


def test_zero_demand_sku_does_not_crash():
    """A SKU with no demand should produce a valid, non-negative policy."""
    p = compute_policy(0, 0, 5, 20, 50, 0.25, 0.95)
    assert p.eoq >= 1
    assert p.safety_stock >= 0


# ---------------- run_sQ_simulation ----------------

def test_no_stockouts_when_massively_overstocked():
    demand = np.full(100, 5.0)
    stockouts, avg_stock, _ = run_sQ_simulation(demand, lead_time=3, reorder_point=500, order_qty=500)
    assert stockouts == 0


def test_stockouts_occur_when_starved():
    """A reorder point of zero with a long lead time must produce stockouts."""
    demand = np.full(100, 20.0)
    stockouts, _, _ = run_sQ_simulation(demand, lead_time=30, reorder_point=0, order_qty=1)
    assert stockouts > 0


def test_higher_reorder_point_never_increases_stockouts():
    """Monotonicity: carrying more buffer cannot make service worse."""
    rng = np.random.default_rng(0)
    demand = rng.poisson(10, size=300).astype(float)
    low, _, _ = run_sQ_simulation(demand, 7, reorder_point=70, order_qty=140)
    high, _, _ = run_sQ_simulation(demand, 7, reorder_point=200, order_qty=140)
    assert high <= low


def test_multiple_orders_can_be_in_flight():
    """For a fast mover whose order cycle is shorter than the lead time, the
    policy must allow several orders in the pipeline -- otherwise it starves.
    This regression test covers a real bug found during development."""
    demand = np.full(200, 50.0)    # 50 units/day
    lead_time = 20                  # 1000 units of demand during lead time
    order_qty = 100                 # order covers only 2 days
    stockouts, _, _ = run_sQ_simulation(demand, lead_time, reorder_point=1000, order_qty=order_qty)
    # With only one order allowed in flight this would stock out almost daily.
    assert stockouts < len(demand) * 0.5


def test_simulation_handles_empty_demand():
    stockouts, avg_stock, ending = run_sQ_simulation([], 5, 100, 100)
    assert stockouts == 0


# ---------------- reorder_status ----------------

def test_reorder_status_red_at_or_below_reorder_point():
    assert reorder_status(50, 100, 10) == "RED"
    assert reorder_status(100, 100, 10) == "RED"


def test_reorder_status_yellow_within_buffer():
    # reorder point 100, 3 days of 10/day demand = buffer to 130
    assert reorder_status(120, 100, 10, yellow_buffer_days=3) == "YELLOW"


def test_reorder_status_green_when_comfortable():
    assert reorder_status(500, 100, 10, yellow_buffer_days=3) == "GREEN"


def test_reorder_status_handles_zero_demand():
    assert reorder_status(500, 100, 0) == "GREEN"


# ---------------- compute_policy_variable_lead_time (additive) ----------------

def test_vlt_reduces_to_fixed_policy_when_std_zero():
    """With zero lead-time variability, the VLT formula must exactly match
    the original fixed-lead-time compute_policy() -- it's a generalisation,
    not a different model."""
    fixed = compute_policy(10, 3, 7, 20, 50, 0.25, 0.95)
    vlt = compute_policy_variable_lead_time(10, 3, 7, 0, 20, 50, 0.25, 0.95)
    assert fixed.safety_stock == vlt.safety_stock
    assert fixed.reorder_point == vlt.reorder_point
    assert fixed.eoq == vlt.eoq


def test_vlt_increases_safety_stock_with_lead_time_variability():
    baseline = compute_policy_variable_lead_time(10, 3, 7, 0, 20, 50, 0.25, 0.95)
    volatile = compute_policy_variable_lead_time(10, 3, 7, 3, 20, 50, 0.25, 0.95)
    assert volatile.safety_stock > baseline.safety_stock
    assert volatile.reorder_point > baseline.reorder_point


def test_vlt_invalid_inputs_raise():
    with pytest.raises(ValueError):
        compute_policy_variable_lead_time(10, 3, 0, 1, 20, 50, 0.25, 0.95)   # zero avg lead time
    with pytest.raises(ValueError):
        compute_policy_variable_lead_time(10, 3, 7, -1, 20, 50, 0.25, 0.95)  # negative std lead time


def test_vlt_carries_lead_time_metadata():
    p = compute_policy_variable_lead_time(10, 3, 7, 2, 20, 50, 0.25, 0.95, sku_id="X")
    assert p.avg_lead_time_days == 7
    assert p.std_lead_time_days == 2


# ---------------- run_sQ_simulation_with_backorders (additive) ----------------

def test_backorder_full_fill_rate_never_loses_units():
    rng = np.random.default_rng(0)
    demand = rng.poisson(10, size=200).astype(float)
    res = run_sQ_simulation_with_backorders(demand, 7, 20, 50, backorder_fill_rate=1.0,
                                             rng=np.random.default_rng(1))
    assert res["units_lost"] == 0.0


def test_backorder_zero_fill_rate_never_backorders():
    rng = np.random.default_rng(0)
    demand = rng.poisson(10, size=200).astype(float)
    res = run_sQ_simulation_with_backorders(demand, 7, 20, 50, backorder_fill_rate=0.0,
                                             rng=np.random.default_rng(1))
    assert res["units_backordered"] == 0.0


def test_backorder_invalid_fill_rate_raises():
    with pytest.raises(ValueError):
        run_sQ_simulation_with_backorders([10, 10], 5, 50, 50, backorder_fill_rate=1.5)


def test_backorder_no_stockouts_when_overstocked():
    demand = np.full(100, 5.0)
    res = run_sQ_simulation_with_backorders(demand, 3, 500, 500, backorder_fill_rate=0.5)
    assert res["stockout_days"] == 0
    assert res["units_lost"] == 0.0
    assert res["units_backordered"] == 0.0


def test_backorder_handles_empty_demand():
    res = run_sQ_simulation_with_backorders([], 5, 100, 100)
    assert res["stockout_days"] == 0


# ---------------- sample_lead_time (additive) ----------------

def test_sample_lead_time_deterministic_when_std_zero():
    rng = np.random.default_rng(0)
    assert sample_lead_time(7, 0, rng) == 7
    assert sample_lead_time(7.6, 0, rng) == 8  # rounds to nearest


def test_sample_lead_time_always_at_least_one_day():
    rng = np.random.default_rng(0)
    samples = [sample_lead_time(2, 5, rng) for _ in range(200)]
    assert min(samples) >= 1


def test_sample_lead_time_varies_with_std():
    rng = np.random.default_rng(0)
    samples = {sample_lead_time(10, 4, rng) for _ in range(100)}
    assert len(samples) > 1  # should produce a spread, not a constant


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
