"""
Bibit Analytics Engine
Calculates CAGR, simple returns, maximum drawdown, annualized volatility,
and Sharpe/Sortino ratios from daily NAV time-series.
Uses standard library math for high performance and zero external dependencies.
"""

import os
import math
from datetime import datetime, date

DEFAULT_ANNUAL_RF = float(os.environ.get("ANNUAL_RF", "0.025"))


def calculate_simple_return(start_val: float, end_val: float) -> float:
    if start_val <= 0:
        return 0.0
    return (end_val - start_val) / start_val


def calculate_cagr(start_val: float, end_val: float, days: float) -> float:
    if start_val <= 0 or end_val <= 0 or days <= 0:
        return 0.0
    years = days / 365.25
    if years <= 0:
        return 0.0
    try:
        return math.pow(end_val / start_val, 1.0 / years) - 1.0
    except (ValueError, OverflowError):
        return 0.0


def calculate_max_drawdown(nav_series: list[float]) -> float:
    if not nav_series:
        return 0.0
    peak = nav_series[0]
    max_dd = 0.0
    for v in nav_series:
        if v > peak:
            peak = v
        elif peak > 0:
            dd = (v - peak) / peak
            if dd < max_dd:
                max_dd = dd
    return max_dd

def calculate_volatility_and_sharpe(
    nav_series: list[float],
    annual_rf: float = DEFAULT_ANNUAL_RF
) -> tuple[float, float, float]:
    """
    Returns: (annualized_volatility, sharpe_ratio, sortino_ratio)
    """
    n = len(nav_series)
    if n < 2:
        return 0.0, 0.0, 0.0

    daily_returns = []
    for i in range(1, n):
        prev = nav_series[i - 1]
        curr = nav_series[i]
        if prev > 0 and curr > 0:
            daily_returns.append((curr - prev) / prev)

    m = len(daily_returns)
    if m == 0:
        return 0.0, 0.0, 0.0

    mean_daily = sum(daily_returns) / m
    var = sum((r - mean_daily) ** 2 for r in daily_returns) / m
    std_daily = math.sqrt(var)
    annualized_vol = std_daily * math.sqrt(252)

    daily_rf = annual_rf / 252
    excess_daily = mean_daily - daily_rf

    # Sharpe ratio
    sharpe = (excess_daily / std_daily) * math.sqrt(252) if std_daily > 0 else 0.0

    # Downside deviation for Sortino
    downside_diffs = [min(0.0, r - daily_rf) ** 2 for r in daily_returns]
    downside_var = sum(downside_diffs) / m
    downside_std = math.sqrt(downside_var)
    sortino = (excess_daily / downside_std) * math.sqrt(252) if downside_std > 0 else 0.0

    return annualized_vol, sharpe, sortino


def compute_metrics_for_window(
    history: list[dict],
    start_date: str,
    annual_rf: float = DEFAULT_ANNUAL_RF
) -> dict:
    """
    Computes metrics for records on or after start_date.
    history is sorted ascending by date.
    Each item in history must have 'date' and 'nav'.
    """
    start_idx = 0
    for idx, p in enumerate(history):
        if p["date"] <= start_date:
            start_idx = idx
        else:
            break

    window = history[start_idx:]
    if len(window) < 2:
        return {
            "return": None,
            "cagr": None,
            "max_drawdown": None,
            "sharpe": None,
            "volatility": None
        }

    start_item = window[0]
    end_item = window[-1]

    d_start = datetime.strptime(start_item["date"], "%Y-%m-%d")
    d_end = datetime.strptime(end_item["date"], "%Y-%m-%d")
    calendar_days = max(1, (d_end - d_start).days)

    navs = [p["nav"] for p in window]
    s_ret = calculate_simple_return(navs[0], navs[-1])
    cagr = calculate_cagr(navs[0], navs[-1], calendar_days)
    mdd = calculate_max_drawdown(navs)
    vol, sharpe, _ = calculate_volatility_and_sharpe(navs, annual_rf)

    return {
        "return": round(s_ret * 100, 2),
        "cagr": round(cagr * 100, 2),
        "max_drawdown": round(mdd * 100, 2),
        "sharpe": round(sharpe, 2),
        "volatility": round(vol * 100, 2)
    }


def compute_all_presets(history: list[dict], reference_date_str: str | None = None, annual_rf: float = DEFAULT_ANNUAL_RF) -> dict:
    """
    Computes metrics for standard windows: 1D, 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, MAX.
    history: sorted list of {'date': 'YYYY-MM-DD', 'nav': float, ...}
    """
    if not history:
        return {}

    if reference_date_str is None:
        ref_date = datetime.strptime(history[-1]["date"], "%Y-%m-%d").date()
    else:
        ref_date = datetime.strptime(reference_date_str, "%Y-%m-%d").date()

    # 1-Day return
    one_day_ret = 0.0
    if len(history) >= 2:
        one_day_ret = round(calculate_simple_return(history[-2]["nav"], history[-1]["nav"]) * 100, 2)

    # Date offsets
    import calendar

    def subtract_years(dt: date, y: int) -> date:
        try:
            return dt.replace(year=dt.year - y)
        except ValueError:
            return dt.replace(year=dt.year - y, day=28)

    def subtract_months(dt: date, m: int) -> date:
        y = dt.year - (m // 12)
        new_m = dt.month - (m % 12)
        if new_m < 1:
            new_m += 12
            y -= 1
        max_d = calendar.monthrange(y, new_m)[1]
        return date(y, new_m, min(dt.day, max_d))

    d_1m = subtract_months(ref_date, 1).strftime("%Y-%m-%d")
    d_3m = subtract_months(ref_date, 3).strftime("%Y-%m-%d")
    d_6m = subtract_months(ref_date, 6).strftime("%Y-%m-%d")
    d_ytd = f"{ref_date.year}-01-01"
    d_1y = subtract_years(ref_date, 1).strftime("%Y-%m-%d")
    d_3y = subtract_years(ref_date, 3).strftime("%Y-%m-%d")
    d_5y = subtract_years(ref_date, 5).strftime("%Y-%m-%d")

    m_1m = compute_metrics_for_window(history, d_1m, annual_rf)
    m_3m = compute_metrics_for_window(history, d_3m, annual_rf)
    m_6m = compute_metrics_for_window(history, d_6m, annual_rf)
    m_ytd = compute_metrics_for_window(history, d_ytd, annual_rf)
    m_1y = compute_metrics_for_window(history, d_1y, annual_rf)
    m_3y = compute_metrics_for_window(history, d_3y, annual_rf)
    m_5y = compute_metrics_for_window(history, d_5y, annual_rf)

    # All-time (Inception)
    d_start = datetime.strptime(history[0]["date"], "%Y-%m-%d")
    d_end = datetime.strptime(history[-1]["date"], "%Y-%m-%d")
    all_days = max(1, (d_end - d_start).days)
    navs = [p["nav"] for p in history]
    m_all = {
        "return": round(calculate_simple_return(navs[0], navs[-1]) * 100, 2),
        "cagr": round(calculate_cagr(navs[0], navs[-1], all_days) * 100, 2),
        "max_drawdown": round(calculate_max_drawdown(navs) * 100, 2),
        "sharpe": round(calculate_volatility_and_sharpe(navs, annual_rf)[1], 2),
        "volatility": round(calculate_volatility_and_sharpe(navs, annual_rf)[0] * 100, 2)
    }

    return {
        "1d_return": one_day_ret,
        "1m": m_1m,
        "3m": m_3m,
        "6m": m_6m,
        "ytd": m_ytd,
        "1y": m_1y,
        "3y": m_3y,
        "5y": m_5y,
        "all": m_all
    }
