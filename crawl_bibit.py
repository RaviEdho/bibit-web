#!/usr/bin/env python3
"""
Bibit.id Mutual Funds & Historical Daily NAV Crawler
---------------------------------------------------
Crawls mutual funds listed and sold on Bibit (api.bibit.id),
including their complete daily historical Net Asset Value (NAV)
from inception to current date.

Author: Bibit Data Assistant
Date: September 2026
"""

import os
import sys
import time
import json
import csv
import sqlite3
import argparse
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
from manager_names import shorten_manager_name

BASE_URL = "https://api.bibit.id"
HEADERS = {
    "Accept": "application/json",
    "Origin": "https://bibit.id",
    "Referer": "https://bibit.id/",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}


def decrypt_bibit(encrypted_data: str) -> dict | list:
    """
    Decrypt AES-256-CBC encrypted response payload from Bibit API.
    Payload format:
      - First 32 hex characters: IV (16 bytes)
      - Last 32 UTF-8 characters: Key (32 bytes / 256 bits)
      - Middle hex characters: Ciphertext
    """
    if not isinstance(encrypted_data, str) or len(encrypted_data) <= 64:
        raise ValueError("Encrypted payload is too short or invalid")

    iv_hex = encrypted_data[:32]
    key_utf8 = encrypted_data[-32:]
    ciphertext_hex = encrypted_data[32:-32]

    iv = bytes.fromhex(iv_hex)
    key = key_utf8.encode("utf-8")
    ciphertext = bytes.fromhex(ciphertext_hex)

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    padded_plaintext = decryptor.update(ciphertext) + decryptor.finalize()

    unpadder = padding.PKCS7(128).unpadder()
    plaintext = unpadder.update(padded_plaintext) + unpadder.finalize()
    return json.loads(plaintext.decode("utf-8"))


def fetch_api(endpoint: str, params: dict | None = None, max_retries: int = 3, timeout: int = 15) -> dict | list:
    """
    Perform a GET request to api.bibit.id and decrypt the response.
    """
    url = f"{BASE_URL}{endpoint}"
    if params:
        url += f"?{urllib.parse.urlencode(params)}"

    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = resp.read().decode("utf-8")
                parsed = json.loads(body)
                if "data" in parsed and isinstance(parsed["data"], str):
                    return decrypt_bibit(parsed["data"])
                return parsed
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ConnectionError) as e:
            if attempt == max_retries:
                raise RuntimeError(f"Failed to fetch {url} after {max_retries} attempts: {e}")
            time.sleep(attempt * 0.8)
        except Exception as e:
            if attempt == max_retries:
                raise
            time.sleep(attempt * 0.8)


def get_all_products(mode: str = "sold") -> list[dict]:
    """
    Fetch mutual fund products from Bibit API.
    Modes:
      - 'sold': All funds distributed/sold on Bibit (tradeable == 1, 177 funds)
      - 'active': Currently active & purchasable on Bibit (tradable=1 query param, 151 funds)
      - 'all': All Indonesian funds in Bibit catalog (all pages, ~2,950 funds)
    """
    products = []
    page = 1
    limit = 100

    print(f"[*] Fetching products list (mode: {mode})...")
    while True:
        params = {
            "page": page,
            "limit": limit,
            "sort": "asc",
            "sort_by": 7  # sort by name
        }
        if mode == "active":
            params["tradable"] = 1

        items = fetch_api("/products/list", params=params)
        if not items or not isinstance(items, list):
            break

        products.extend(items)
        print(f"    Page {page}: fetched {len(items)} items (total so far: {len(products)})")

        if len(items) < limit:
            break
        page += 1

    if mode == "sold":
        filtered = [p for p in products if p.get("tradeable") == 1]
        print(f"[+] Total catalog products: {len(products)}. Filtered to {len(filtered)} funds sold on Bibit.")
        return filtered
    elif mode == "active":
        print(f"[+] Total active funds available on Bibit: {len(products)}.")
        return products
    else:
        print(f"[+] Total products fetched: {len(products)}.")
        return products


def get_fund_nav_history(symbol: str) -> list[dict]:
    """
    Fetch complete historical daily NAV for a fund using /products/{symbol}/chart?period=all
    """
    res = fetch_api(f"/products/{symbol}/chart", params={"period": "all"})
    if isinstance(res, dict):
        chart = res.get("chart", [])
        return chart if isinstance(chart, list) else []
    elif isinstance(res, list):
        return res
    return []


def init_sqlite_db(db_path: str):
    """
    Initialize SQLite database schema for products and NAV history.
    """
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        symbol TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        type TEXT,
        investment_manager TEXT,
        custodian_bank TEXT,
        released_date TEXT,
        nav REAL,
        aum REAL,
        sharia INTEGER,
        tradeable INTEGER,
        notbuyable INTEGER,
        status INTEGER,
        cagr_1y REAL,
        cagr_3y REAL,
        cagr_5y REAL,
        expense_ratio REAL,
        min_buy REAL,
        risk_profile INTEGER,
        raw_json TEXT,
        updated_at TEXT
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS nav_history (
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        timestamp INTEGER,
        nav REAL NOT NULL,
        nav_adjusted REAL,
        PRIMARY KEY (symbol, date),
        FOREIGN KEY (symbol) REFERENCES products(symbol)
    )
    """)

    cur.execute("PRAGMA journal_mode=WAL;")
    cur.execute("PRAGMA synchronous=NORMAL;")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_nav_date ON nav_history(date)")
    conn.commit()
    conn.close()

def extract_product_fields(p: dict) -> dict:
    im = p.get("investment_manager")
    im_name = im.get("name") if isinstance(im, dict) else None
    im_name = shorten_manager_name(im_name)

    cb = p.get("custodian_bank")
    cb_name = cb.get("name") if isinstance(cb, dict) else None

    nav_obj = p.get("nav")
    nav_val = nav_obj.get("value") if isinstance(nav_obj, dict) else (nav_obj if isinstance(nav_obj, (int, float)) else None)
    nav_date = nav_obj.get("date") if isinstance(nav_obj, dict) else None

    aum_obj = p.get("aum")
    aum_val = aum_obj.get("value") if isinstance(aum_obj, dict) else (aum_obj if isinstance(aum_obj, (int, float)) else None)

    er_obj = p.get("expenseratio")
    er_val = er_obj.get("percentage") if isinstance(er_obj, dict) else (er_obj if isinstance(er_obj, (int, float)) else None)

    cagr = p.get("cagr") or {}
    cagr_1y = cagr.get("1y") if isinstance(cagr, dict) else None
    cagr_3y = cagr.get("3y") if isinstance(cagr, dict) else None
    cagr_5y = cagr.get("5y") if isinstance(cagr, dict) else None

    return {
        "id": p.get("id"),
        "symbol": p.get("symbol"),
        "name": p.get("name"),
        "type": p.get("type"),
        "investment_manager": im_name,
        "custodian_bank": cb_name,
        "released_date": p.get("released_date"),
        "nav": nav_val,
        "nav_date": nav_date,
        "aum": aum_val,
        "sharia": 1 if p.get("sharia") else 0,
        "tradeable": p.get("tradeable"),
        "notbuyable": p.get("notbuyable"),
        "status": p.get("status"),
        "cagr_1y": cagr_1y,
        "cagr_3y": cagr_3y,
        "cagr_5y": cagr_5y,
        "expense_ratio": er_val,
        "min_buy": p.get("minbuy"),
        "risk_profile": p.get("riskprofile"),
        "raw_json": json.dumps(p, ensure_ascii=False),
    }


def save_products_to_sqlite(db_path: str, products: list[dict]):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    now_str = datetime.now().isoformat()

    for p in products:
        item = extract_product_fields(p)
        cur.execute("""
        INSERT OR REPLACE INTO products (
            id, symbol, name, type, investment_manager, custodian_bank,
            released_date, nav, aum, sharia, tradeable, notbuyable, status,
            cagr_1y, cagr_3y, cagr_5y, expense_ratio, min_buy, risk_profile,
            raw_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            item["id"],
            item["symbol"],
            item["name"],
            item["type"],
            item["investment_manager"],
            item["custodian_bank"],
            item["released_date"],
            item["nav"],
            item["aum"],
            item["sharia"],
            item["tradeable"],
            item["notbuyable"],
            item["status"],
            item["cagr_1y"],
            item["cagr_3y"],
            item["cagr_5y"],
            item["expense_ratio"],
            item["min_buy"],
            item["risk_profile"],
            item["raw_json"],
            now_str
        ))

    conn.commit()
    conn.close()


def save_nav_to_sqlite(db_path: str, symbol: str, chart_data: list[dict]):
    if not chart_data:
        return
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    rows = []
    for item in chart_data:
        date_str = item.get("formated_date")
        val = item.get("value")
        if not date_str or val is None:
            continue
        ts = item.get("date")
        adj = item.get("value_adjusted", val)
        rows.append((symbol, date_str, ts, float(val), float(adj)))

    cur.executemany("""
    INSERT OR REPLACE INTO nav_history (symbol, date, timestamp, nav, nav_adjusted)
    VALUES (?, ?, ?, ?, ?)
    """, rows)

    conn.commit()
    conn.close()


def export_products_csv(products: list[dict], output_path: str):
    fieldnames = [
        "symbol", "name", "type", "investment_manager", "custodian_bank",
        "released_date", "nav", "nav_date", "aum", "sharia", "tradeable", "notbuyable",
        "cagr_1y", "cagr_3y", "cagr_5y", "expense_ratio", "min_buy"
    ]
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for p in products:
            item = extract_product_fields(p)
            writer.writerow({
                "symbol": item["symbol"],
                "name": item["name"],
                "type": item["type"],
                "investment_manager": item["investment_manager"],
                "custodian_bank": item["custodian_bank"],
                "released_date": item["released_date"],
                "nav": item["nav"],
                "nav_date": item["nav_date"],
                "aum": item["aum"],
                "sharia": item["sharia"],
                "tradeable": item["tradeable"],
                "notbuyable": item["notbuyable"],
                "cagr_1y": item["cagr_1y"],
                "cagr_3y": item["cagr_3y"],
                "cagr_5y": item["cagr_5y"],
                "expense_ratio": item["expense_ratio"],
                "min_buy": item["min_buy"],
            })

def export_fund_nav_csv(symbol: str, chart_data: list[dict], output_path: str):
    fieldnames = ["date", "timestamp", "nav", "nav_adjusted"]
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for item in chart_data:
            writer.writerow({
                "date": item.get("formated_date"),
                "timestamp": item.get("date"),
                "nav": item.get("value"),
                "nav_adjusted": item.get("value_adjusted"),
            })


def main():
    parser = argparse.ArgumentParser(description="Crawl Bibit mutual funds & historical daily NAV.")
    parser.add_argument(
        "--mode",
        choices=["sold", "active", "all"],
        default="sold",
        help="Target products: 'sold' (177 mutual funds sold on Bibit), 'active' (151 currently buyable funds), 'all' (entire Indonesian catalog ~2,950 funds). Default: sold."
    )
    parser.add_argument("--out-dir", default="data", help="Output directory (default: data)")
    parser.add_argument("--workers", type=int, default=5, help="Concurrent workers for NAV fetching (default: 5)")
    parser.add_argument("--skip-nav", action="store_true", help="Only download product list, skip NAV history")
    parser.add_argument("--refresh-products", action="store_true", help="Force re-fetching products list even if cached")
    parser.add_argument("--consolidate-csv", action="store_true", default=True, help="Generate single consolidated all_nav_daily.csv (default: True)")
    parser.add_argument("--limit-funds", type=int, default=None, help="Limit number of funds to process (for testing)")

    args = parser.parse_args()

    out_dir = args.out_dir
    os.makedirs(out_dir, exist_ok=True)
    nav_dir = os.path.join(out_dir, "nav_daily")
    os.makedirs(nav_dir, exist_ok=True)

    db_path = os.path.join(out_dir, "bibit.sqlite")
    init_sqlite_db(db_path)

    products_json_path = os.path.join(out_dir, "mutual_funds.json")
    products = None

    # Check local cache
    if os.path.exists(products_json_path) and not args.refresh_products:
        try:
            with open(products_json_path, "r", encoding="utf-8") as f:
                cached = json.load(f)
                if isinstance(cached, list) and len(cached) > 0:
                    products = cached
                    print(f"[*] Loaded {len(products)} products from cache: {products_json_path}")
        except Exception:
            products = None

    # Fetch if not cached
    if products is None:
        products = get_all_products(mode=args.mode)
        with open(products_json_path, "w", encoding="utf-8") as f:
            json.dump(products, f, indent=2, ensure_ascii=False)
        print(f"[+] Saved full products JSON: {products_json_path}")

    if args.limit_funds:
        products = products[:args.limit_funds]
        print(f"[*] Limiting run to first {len(products)} funds.")

    products_csv_path = os.path.join(out_dir, "mutual_funds.csv")
    export_products_csv(products, products_csv_path)
    print(f"[+] Saved products CSV summary: {products_csv_path}")

    save_products_to_sqlite(db_path, products)
    print(f"[+] Saved products into SQLite database: {db_path}")

    if args.skip_nav:
        print("[*] Skipping NAV history crawl as requested (--skip-nav).")
        return

    # 2. Fetch Historical Daily NAV for each fund
    print(f"\n[*] Starting historical daily NAV crawl for {len(products)} funds using {args.workers} workers...")
    total_nav_points = 0
    start_time = time.time()

    consolidated_rows = []

    def process_fund(fund):
        symbol = fund.get("symbol")
        name = fund.get("name")
        try:
            chart_data = get_fund_nav_history(symbol)
            count = len(chart_data)

            # Save per-fund CSV
            csv_path = os.path.join(nav_dir, f"{symbol}.csv")
            export_fund_nav_csv(symbol, chart_data, csv_path)

            # Save to SQLite
            save_nav_to_sqlite(db_path, symbol, chart_data)

            return symbol, name, count, chart_data, None
        except Exception as e:
            return symbol, name, 0, [], str(e)

    completed = 0
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        future_map = {executor.submit(process_fund, p): p for p in products}
        for future in as_completed(future_map):
            completed += 1
            symbol, name, count, chart_data, error = future.result()
            total_nav_points += count
            if error:
                print(f"[{completed}/{len(products)}] ❌ {symbol} ({name}): Error - {error}")
            else:
                if args.consolidate_csv and chart_data:
                    for item in chart_data:
                        consolidated_rows.append({
                            "symbol": symbol,
                            "date": item.get("formated_date"),
                            "timestamp": item.get("date"),
                            "nav": item.get("value"),
                            "nav_adjusted": item.get("value_adjusted")
                        })

                date_range = ""
                if count > 0:
                    date_range = f" ({chart_data[0].get('formated_date')} to {chart_data[-1].get('formated_date')})"
                print(f"[{completed}/{len(products)}] ✅ {symbol} - {name[:30]}: {count} daily NAV points{date_range}")

    # Export consolidated CSV if requested
    if args.consolidate_csv and consolidated_rows:
        consolidated_csv_path = os.path.join(out_dir, "all_nav_daily.csv")
        print(f"\n[*] Writing consolidated CSV ({len(consolidated_rows):,} rows) to {consolidated_csv_path}...")
        consolidated_rows.sort(key=lambda r: (r["symbol"], r["date"]))
        with open(consolidated_csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["symbol", "date", "timestamp", "nav", "nav_adjusted"])
            writer.writeheader()
            writer.writerows(consolidated_rows)
        print(f"[+] Saved consolidated CSV: {consolidated_csv_path}")

    elapsed = time.time() - start_time
    print(f"\n[🎉] Crawl completed in {elapsed:.1f} seconds!")
    print(f"    - Total mutual funds: {len(products)}")
    print(f"    - Total historical daily NAV records: {total_nav_points:,}")
    print(f"    - SQLite database: {db_path}")
    print(f"    - Per-fund CSV directory: {nav_dir}/")
    if args.consolidate_csv and consolidated_rows:
        print(f"    - Consolidated CSV: {os.path.join(out_dir, 'all_nav_daily.csv')}")

if __name__ == "__main__":
    main()
