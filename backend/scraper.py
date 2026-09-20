"""
Bibit Scraper Worker
Performs daily incremental scrape of mutual funds & NAV charts from api.bibit.id,
updates bibit.sqlite, and triggers static public cache export.
"""

import os
import sys
import time
import json
import sqlite3
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

from bibit_api import fetch_api
from analytics import compute_all_presets
from exporter import export_public_cache
from manager_names import shorten_manager_name


def update_products_catalog(db_path: str):
    """
    Fetches the active funds list from /products/list and updates the products table.
    """
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    now_str = datetime.now().isoformat()

    print("[*] Updating product catalog from Bibit API...")
    page = 1
    total_fetched = 0

    while True:
        params = {
            "page": page,
            "limit": 100,
            "sort": "asc",
            "sort_by": 7,
            "tradable": 1
        }
        try:
            items = fetch_api("/products/list", params=params)
        except Exception as e:
            print(f"[-] Error fetching products list page {page}: {e}")
            break

        if not items or not isinstance(items, list):
            break

        for p in items:
            im = p.get("investment_manager")
            im_name = im.get("name") if isinstance(im, dict) else None
            im_name = shorten_manager_name(im_name)

            cb = p.get("custodian_bank")
            cb_name = cb.get("name") if isinstance(cb, dict) else None

            nav_obj = p.get("nav")
            nav_val = nav_obj.get("value") if isinstance(nav_obj, dict) else (nav_obj if isinstance(nav_obj, (int, float)) else None)

            aum_obj = p.get("aum")
            aum_val = aum_obj.get("value") if isinstance(aum_obj, dict) else (aum_obj if isinstance(aum_obj, (int, float)) else None)

            er_obj = p.get("expenseratio")
            er_val = er_obj.get("percentage") if isinstance(er_obj, dict) else (er_obj if isinstance(er_obj, (int, float)) else None)

            # Internal calculation will populate CAGRs directly from nav_history
            cagr_1y = None
            cagr_3y = None
            cagr_5y = None
            cur.execute("""
            INSERT OR REPLACE INTO products (
                id, symbol, name, type, investment_manager, custodian_bank,
                released_date, nav, aum, sharia, tradeable, notbuyable, status,
                cagr_1y, cagr_3y, cagr_5y, expense_ratio, min_buy, risk_profile,
                raw_json, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                p.get("id"),
                p.get("symbol"),
                p.get("name"),
                p.get("type"),
                im_name,
                cb_name,
                p.get("released_date"),
                nav_val,
                aum_val,
                1 if p.get("sharia") else 0,
                p.get("tradeable"),
                p.get("notbuyable"),
                p.get("status"),
                cagr_1y,
                cagr_3y,
                cagr_5y,
                er_val,
                p.get("minbuy"),
                p.get("riskprofile"),
                json.dumps(p, ensure_ascii=False),
                now_str
            ))

        total_fetched += len(items)
        if len(items) < 100:
            break
        page += 1

    conn.commit()
    conn.close()
    print(f"[+] Product catalog updated ({total_fetched} active funds).")


def scrape_fund_nav_delta(symbol: str, period: str = "1m") -> tuple[str, list[dict], str | None]:
    """
    Fetches NAV chart points for a fund (defaults to period=1m for daily delta).
    """
    try:
        res = fetch_api(f"/products/{symbol}/chart", params={"period": period})
        if isinstance(res, dict):
            chart = res.get("chart", [])
            return symbol, chart if isinstance(chart, list) else [], None
        elif isinstance(res, list):
            return symbol, res, None
        return symbol, [], None
    except Exception as e:
        return symbol, [], str(e)


def run_daily_sync(db_path: str, public_dir: str, period: str = "1m", workers: int = 5):
    """
    Executes a complete daily delta sync:
    1. Updates product metadata
    2. Fetches delta NAV points (last 30 days via period=1m)
    3. Saves into SQLite
    4. Triggers public cache export
    """
    t_start = time.time()
    print(f"\n=======================================================")
    print(f"[*] Starting Bibit Sync Job: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"    - Period: {period}")
    print(f"    - Database: {db_path}")
    print(f"    - Public dir: {public_dir}")
    print(f"=======================================================")

    # 1. Update product catalog
    update_products_catalog(db_path)

    # 2. Get active symbols from DB and identify dividend funds
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT symbol, name, raw_json FROM products WHERE tradeable = 1")
    fund_rows = cur.fetchall()
    conn.close()

    div_symbols = set()
    for sym, _, raw_json in fund_rows:
        raw = json.loads(raw_json) if raw_json else {}
        if bool(raw.get("is_has_dividend") or raw.get("dividend_date")):
            div_symbols.add(sym)

    print(f"[*] Scraping NAV delta for {len(fund_rows)} funds ({len(div_symbols)} dividend funds) using {workers} workers...")
    new_rows_count = 0
    errors = 0

    def task(item):
        sym, _, _ = item
        # For dividend funds, fetch period="all" because Bibit computes value_adjusted relative
        # to the beginning of the requested timeframe. period="all" ensures continuous total return.
        p = "all" if sym in div_symbols else period
        return scrape_fund_nav_delta(sym, period=p)
    batch_inserts = []
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(task, item): item for item in fund_rows}
        for f in as_completed(futures):
            sym, chart, err = f.result()
            if err:
                errors += 1
                print(f"[-] Error fetching {sym}: {err}")
                continue

            for pt in chart:
                d_str = pt.get("formated_date")
                val = pt.get("value")
                if not d_str or val is None or float(val) <= 0:
                    continue
                ts = pt.get("date")
                adj = pt.get("value_adjusted", val)
                batch_inserts.append((sym, d_str, ts, float(val), float(adj)))

    # Save to SQLite
    if batch_inserts:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.executemany("""
            INSERT OR REPLACE INTO nav_history (symbol, date, timestamp, nav, nav_adjusted)
            VALUES (?, ?, ?, ?, ?)
        """, batch_inserts)
        conn.commit()
        conn.close()
        new_rows_count = len(batch_inserts)

    # 3. Recalculate all metrics (CAGR 1Y, 3Y, 5Y) directly from nav_history
    print("[*] Recalculating CAGR metrics from historical daily NAV series...")
    recalculate_db_metrics(db_path)

    elapsed_scrape = time.time() - t_start
    print(f"[+] Scraped and synchronized {new_rows_count:,} data points in {elapsed_scrape:.1f}s (Errors: {errors})")

    # 4. Export to public static cache
    export_public_cache(db_path, public_dir)
    total_elapsed = time.time() - t_start
    print(f"[🎉] Sync job completed successfully in {total_elapsed:.1f} seconds.\n")
def recalculate_db_metrics(db_path: str):
    """
    Iterates all products in SQLite and recalculates cagr_1y, cagr_3y, cagr_5y
    from the actual nav_history rows instead of relying on Bibit API metadata.
    """
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT symbol, raw_json FROM products WHERE tradeable = 1")
    products = cur.fetchall()

    updates = []
    for sym, raw_json in products:
        raw = json.loads(raw_json) if raw_json else {}
        is_dividend = bool(raw.get("is_has_dividend") or raw.get("dividend_date"))

        cur.execute("""
            SELECT date, nav, nav_adjusted
            FROM nav_history
            WHERE symbol = ? AND nav > 0
            ORDER BY date ASC
        """, (sym,))
        history_rows = cur.fetchall()
        if not history_rows:
            continue
        history = [
            {
                "date": r[0],
                "nav": r[2] if (is_dividend and r[2] is not None and r[2] > 0) else r[1],
            }
            for r in history_rows
        ]
        presets = compute_all_presets(history)

        c1y = presets.get("1y", {}).get("cagr")
        c3y = presets.get("3y", {}).get("cagr")
        c5y = presets.get("5y", {}).get("cagr")

        updates.append((c1y, c3y, c5y, sym))
    cur.executemany("""
        UPDATE products
        SET cagr_1y = ?, cagr_3y = ?, cagr_5y = ?
        WHERE symbol = ?
    """, updates)

    conn.commit()
    conn.close()
    print(f"[+] Successfully recalculated and updated CAGR for {len(updates)} funds in SQLite.")
