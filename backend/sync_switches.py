#!/usr/bin/env python3
"""
Sync Bibit Mutual Fund Switching Destinations
Queries /portfolios/products/switch for all active funds and updates
the product_switches table in bibit.sqlite.

Usage:
  python3 sync_switches.py --token "eyJ..."
  or
  export BIBIT_ACCESS_TOKEN="eyJ..."
  python3 sync_switches.py
"""

import os
import sys
import time
import json
import sqlite3
import argparse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

from bibit_api import BASE_URL, HEADERS, fetch_api
from exporter import export_public_cache


def init_switches_table(conn: sqlite3.Connection):
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS product_switches (
        source_symbol TEXT NOT NULL,
        target_symbol TEXT NOT NULL,
        updated_at TEXT,
        PRIMARY KEY (source_symbol, target_symbol),
        FOREIGN KEY (source_symbol) REFERENCES products(symbol),
        FOREIGN KEY (target_symbol) REFERENCES products(symbol)
    )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_switches_source ON product_switches(source_symbol)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_switches_target ON product_switches(target_symbol)")
    conn.commit()


def sync_switching_destinations(db_path: str, token: str, workers: int = 5, export_dir: str | None = None):
    conn = sqlite3.connect(db_path)
    init_switches_table(conn)

    cur = conn.cursor()
    cur.execute("SELECT symbol, name FROM products WHERE tradeable = 1 ORDER BY symbol ASC")
    funds = cur.fetchall()
    conn.close()

    if not funds:
        print("[!] No active funds found in database. Run scraper first.")
        return

    print(f"[*] Starting switching destinations scan for {len(funds)} funds...")
    print(f"    - Workers: {workers}")
    print(f"    - Database: {db_path}")

    headers = dict(HEADERS)
    headers["Authorization"] = f"Bearer {token}"

    results = {}
    errors = []
    t_start = time.time()

    def fetch_fund_switch(sym, name):
        url = f"{BASE_URL}/portfolios/products/switch?symbol={sym}"
        req = urllib.request.Request(url, headers=headers)
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    parsed = json.loads(resp.read().decode("utf-8"))
                    data = parsed.get("data", [])
                    dest_symbols = [d["symbol"] for d in data if "symbol" in d]
                    return sym, name, dest_symbols, None
            except Exception as e:
                if attempt == 2:
                    return sym, name, [], str(e)
                time.sleep(0.5)

    completed = 0
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(fetch_fund_switch, f[0], f[1]): f[0] for f in funds}
        for future in as_completed(futures):
            completed += 1
            sym, name, dests, err = future.result()
            if err:
                errors.append((sym, err))
                print(f"[{completed}/{len(funds)}] ❌ {sym}: {err}")
            else:
                results[sym] = dests
                if dests:
                    print(f"[{completed}/{len(funds)}] ✅ {sym} ({name[:25]}): {len(dests)} destinations")
                else:
                    print(f"[{completed}/{len(funds)}] ⚪ {sym} ({name[:25]}): 0 destinations")

    # Persist to SQLite
    now_str = datetime.now().isoformat()
    rows = []
    for src, dests in results.items():
        for dst in dests:
            rows.append((src, dst, now_str))

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("DELETE FROM product_switches")
    cur.executemany("""
    INSERT OR REPLACE INTO product_switches (source_symbol, target_symbol, updated_at)
    VALUES (?, ?, ?)
    """, rows)
    conn.commit()
    conn.close()

    elapsed = time.time() - t_start
    switchable_funds = sum(1 for d in results.values() if d)
    print(f"\n[🎉] Sync completed in {elapsed:.1f}s!")
    print(f"    - Total funds: {len(funds)}")
    print(f"    - Funds with switch destinations: {switchable_funds}")
    print(f"    - Total destination pairs: {len(rows)}")
    print(f"    - Errors: {len(errors)}")

    if export_dir:
        print(f"[*] Re-exporting public cache into {export_dir}...")
        export_public_cache(db_path, export_dir)


def main():
    parser = argparse.ArgumentParser(description="Sync Bibit mutual fund switching destinations.")
    parser.add_argument("--token", default=os.environ.get("BIBIT_ACCESS_TOKEN"), help="Bibit User Access Token (Bearer JWT)")
    parser.add_argument("--db", default=os.environ.get("BIBIT_DB_PATH", "data/bibit.sqlite"), help="SQLite database path")
    parser.add_argument("--export-dir", default=os.environ.get("BIBIT_PUBLIC_DIR", "data/public"), help="Public static cache directory")
    parser.add_argument("--workers", type=int, default=5, help="Concurrent workers (default: 5)")
    parser.add_argument("--no-export", action="store_true", help="Skip re-exporting public JSON cache")

    args = parser.parse_args()

    if not args.token:
        print("[!] Error: Access token is required.")
        print("    Pass via --token 'eyJ...' or set export BIBIT_ACCESS_TOKEN='eyJ...'")
        sys.exit(1)

    export_dir = None if args.no_export else args.export_dir
    sync_switching_destinations(args.db, args.token, workers=args.workers, export_dir=export_dir)


if __name__ == "__main__":
    main()
