"""
Bibit Static Cache Exporter
Queries bibit.sqlite, computes return & risk metrics, and atomically
writes summary.json and individual funds/{symbol}.json for public SPA serving.
"""

import os
import json
import sqlite3
from datetime import datetime

from analytics import compute_all_presets
from manager_names import shorten_manager_name


def export_public_cache(db_path: str, public_dir: str):
    """
    Exports static JSON files into public_dir:
      - public_dir/summary.json
      - public_dir/funds/{symbol}.json
    Uses atomic write + os.replace to prevent partial reads by Nginx.
    """
    funds_dir = os.path.join(public_dir, "funds")
    os.makedirs(funds_dir, exist_ok=True)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Query all active/tradeable products
    cur.execute("""
        SELECT symbol, name, type, investment_manager, custodian_bank,
               released_date, nav, aum, sharia, tradeable, notbuyable,
               expense_ratio, min_buy, risk_profile, updated_at, raw_json
        FROM products
        WHERE tradeable = 1
        ORDER BY aum DESC NULLS LAST
    """)
    products = cur.fetchall()

    # Load switching destinations if available
    switch_map = {}
    try:
        cur.execute("""
            SELECT ps.source_symbol, ps.target_symbol, p.name, p.type
            FROM product_switches ps
            JOIN products p ON ps.target_symbol = p.symbol
            ORDER BY p.type ASC, p.name ASC
        """)
        for src, tgt, tgt_name, tgt_type in cur.fetchall():
            if src not in switch_map:
                switch_map[src] = []
            switch_map[src].append({
                "symbol": tgt,
                "name": tgt_name,
                "type": tgt_type
            })
    except sqlite3.OperationalError:
        switch_map = {}

    summary_list = []
    total_points = 0
    now_str = datetime.now().isoformat()

    print(f"[*] Exporting static public cache for {len(products)} funds into {public_dir}...")

    for row in products:
        (
            symbol, name, p_type, manager, custodian,
            released_date, latest_nav, aum, sharia, tradeable, notbuyable,
            expense_ratio, min_buy, risk_profile, updated_at, raw_json
        ) = row
        manager = shorten_manager_name(manager)

        raw_data = json.loads(raw_json) if raw_json else {}
        inst_obj = raw_data.get("instant_redemption") if isinstance(raw_data.get("instant_redemption"), dict) else {}
        is_instant = bool(raw_data.get("is_instant_redemption") or raw_data.get("instant_redemption"))
        instant_type = inst_obj.get("type") if inst_obj else (1 if is_instant else None)
        is_index = bool(raw_data.get("index") or raw_data.get("etf"))
        is_dividend = bool(raw_data.get("is_has_dividend") or raw_data.get("dividend_date"))
        # Fetch ascending history
        cur.execute("""
            SELECT date, nav, nav_adjusted
            FROM nav_history
            WHERE symbol = ? AND nav > 0
            ORDER BY date ASC
        """, (symbol,))
        history_rows = cur.fetchall()

        if not history_rows:
            continue

        # For dividend funds, use nav_adjusted for returns, CAGR, and chart series (total return)
        effective_history = [
            {
                "date": r[0],
                "nav": r[2] if (is_dividend and r[2] is not None and r[2] > 0) else r[1],
            }
            for r in history_rows
        ]
        total_points += len(history_rows)

        # Compute all preset metrics (1D, 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, MAX)
        presets = compute_all_presets(effective_history)

        # Build chart series (TradingView expects {time: "YYYY-MM-DD", value: number})
        # For dividend funds, series includes both adjusted value and raw_nav (original unit price)
        if is_dividend:
            series = [
                {
                    "time": r[0],
                    "value": r[2] if (r[2] is not None and r[2] > 0) else r[1],
                    "raw_nav": r[1],
                }
                for r in history_rows
            ]
        else:
            series = [
                {
                    "time": r[0],
                    "value": r[1],
                }
                for r in history_rows
            ]

        latest_unit_nav = history_rows[-1][1]

        # Build individual fund detail JSON
        fund_payload = {
            "symbol": symbol,
            "name": name,
            "type": p_type,
            "investment_manager": manager,
            "custodian_bank": custodian,
            "released_date": released_date,
            "latest_nav": latest_unit_nav,
            "latest_date": history_rows[-1][0],
            "start_date": history_rows[0][0],
            "history_points": len(history_rows),
            "aum": aum,
            "sharia": bool(sharia),
            "tradeable": tradeable,
            "notbuyable": notbuyable,
            "is_instant_redemption": is_instant,
            "instant_type": instant_type,
            "is_index_fund": is_index,
            "is_dividend": is_dividend,
            "expense_ratio": expense_ratio,
            "min_buy": min_buy,
            "risk_profile": risk_profile,
            "metrics": presets,
            "series": series,
            "switch_destinations": switch_map.get(symbol, []),
        }

        fund_file = os.path.join(funds_dir, f"{symbol}.json")
        temp_fund_file = f"{fund_file}.tmp"
        with open(temp_fund_file, "w", encoding="utf-8") as f:
            json.dump(fund_payload, f, separators=(",", ":"))
        os.replace(temp_fund_file, fund_file)

        # Append to summary table
        m_1y = presets.get("1y") or {}
        m_3y = presets.get("3y") or {}
        m_5y = presets.get("5y") or {}
        m_all = presets.get("all") or {}
        m_1m = presets.get("1m") or {}
        m_ytd = presets.get("ytd") or {}

        summary_list.append({
            "symbol": symbol,
            "name": name,
            "type": p_type,
            "manager": manager,
            "aum": aum,
            "nav": latest_unit_nav,
            "sharia": bool(sharia),
            "tradeable": tradeable,
            "notbuyable": notbuyable,
            "is_instant_redemption": is_instant,
            "instant_type": instant_type,
            "is_index_fund": is_index,
            "is_dividend": is_dividend,
            "switch_destinations_count": len(switch_map.get(symbol, [])),
            # Returns
            "return_1d": presets.get("1d_return"),
            "return_1m": m_1m.get("return"),
            "return_ytd": m_ytd.get("return"),
            "return_1y": m_1y.get("return"),
            "return_3y": m_3y.get("return"),
            "return_5y": m_5y.get("return"),
            # CAGR
            "cagr_1y": m_1y.get("cagr"),
            "cagr_3y": m_3y.get("cagr"),
            # Max Drawdown per timeframe
            "max_drawdown_1m": m_1m.get("max_drawdown"),
            "max_drawdown_ytd": m_ytd.get("max_drawdown"),
            "max_drawdown_1y": m_1y.get("max_drawdown"),
            "max_drawdown_3y": m_3y.get("max_drawdown"),
            "max_drawdown_5y": m_5y.get("max_drawdown"),
            # Quality Score per timeframe
            "quality_score_1m": m_1m.get("quality_score"),
            "quality_score_ytd": m_ytd.get("quality_score"),
            "quality_score_1y": m_1y.get("quality_score"),
            "quality_score_3y": m_3y.get("quality_score"),
            "quality_score_5y": m_5y.get("quality_score"),
        })

    conn.close()

    # Write summary.json
    summary_payload = {
        "last_updated": now_str,
        "total_funds": len(summary_list),
        "total_nav_points": total_points,
        "funds": summary_list
    }

    summary_file = os.path.join(public_dir, "summary.json")
    temp_summary_file = f"{summary_file}.tmp"
    with open(temp_summary_file, "w", encoding="utf-8") as f:
        json.dump(summary_payload, f, separators=(",", ":"))
    os.replace(temp_summary_file, summary_file)

    print(f"[+] Successfully exported {len(summary_list)} funds ({total_points:,} points) to {public_dir}")

    # Export switching network graph JSON
    export_switching_graph(db_path, public_dir)


def export_switching_graph(db_path: str, public_dir: str):
    """
    Exports public_dir/switching_graph.json containing full graph of switchable funds,
    their connections, and clustering by Investment Manager.
    """
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Check if product_switches table exists
    try:
        cur.execute("SELECT COUNT(*) FROM product_switches")
        if cur.fetchone()[0] == 0:
            conn.close()
            return
    except sqlite3.OperationalError:
        conn.close()
        return

    cur.execute("""
        SELECT DISTINCT p.symbol, p.name, p.type, p.investment_manager, 
               p.aum, p.nav, p.sharia, p.risk_profile, p.min_buy, p.raw_json
        FROM products p
        WHERE p.symbol IN (
            SELECT source_symbol FROM product_switches
            UNION
            SELECT target_symbol FROM product_switches
        )
        ORDER BY p.investment_manager, p.type, p.name
    """)
    funds_rows = cur.fetchall()

    cur.execute("""
        SELECT source_symbol, target_symbol
        FROM product_switches
        ORDER BY source_symbol, target_symbol
    """)
    edges_rows = cur.fetchall()

    adj = {}
    in_adj = {}
    for src, dst in edges_rows:
        adj.setdefault(src, []).append(dst)
        in_adj.setdefault(dst, []).append(src)

    nodes = []
    manager_map = {}

    for r in funds_rows:
        sym, name, p_type, manager, aum, nav, sharia, risk, min_buy, raw_json = r
        manager = shorten_manager_name(manager)
        raw_data = json.loads(raw_json) if raw_json else {}
        inst_obj = raw_data.get("instant_redemption") if isinstance(raw_data.get("instant_redemption"), dict) else {}
        is_instant = bool(raw_data.get("is_instant_redemption") or raw_data.get("instant_redemption"))
        instant_type = inst_obj.get("type") if inst_obj else (1 if is_instant else None)
        node = {
            "symbol": sym,
            "name": name,
            "type": p_type,
            "manager": manager,
            "aum": aum,
            "nav": nav,
            "sharia": bool(sharia),
            "is_instant_redemption": is_instant,
            "instant_type": instant_type,
            "risk_profile": risk,
            "min_buy": min_buy,
            "out_count": len(adj.get(sym, [])),
            "in_count": len(in_adj.get(sym, [])),
            "destinations": adj.get(sym, [])
        }
        nodes.append(node)
        manager_map.setdefault(manager, []).append(node)

    managers_summary = []
    for mgr, mgr_nodes in manager_map.items():
        mgr_symbols = {n["symbol"] for n in mgr_nodes}
        mgr_edges = [{"source": s, "target": d} for s, d in edges_rows if s in mgr_symbols and d in mgr_symbols]
        managers_summary.append({
            "name": mgr,
            "fund_count": len(mgr_nodes),
            "pair_count": len(mgr_edges),
            "funds": mgr_nodes,
            "edges": mgr_edges
        })

    managers_summary.sort(key=lambda m: (-m["pair_count"], m["name"]))
    conn.close()

    graph_payload = {
        "last_updated": datetime.now().isoformat(),
        "total_funds": len(nodes),
        "total_edges": len(edges_rows),
        "total_managers": len(managers_summary),
        "managers": managers_summary,
        "nodes": nodes,
        "edges": [{"source": s, "target": d} for s, d in edges_rows],
        "adjacency": adj
    }

    out_file = os.path.join(public_dir, "switching_graph.json")
    temp_out_file = f"{out_file}.tmp"
    with open(temp_out_file, "w", encoding="utf-8") as f:
        json.dump(graph_payload, f, separators=(",", ":"))
    os.replace(temp_out_file, out_file)
    print(f"[+] Successfully exported switching graph ({len(nodes)} nodes, {len(edges_rows)} edges) to {out_file}")


if __name__ == "__main__":
    db = os.environ.get("BIBIT_DB_PATH", "../data/bibit.sqlite")
    pub = os.environ.get("BIBIT_PUBLIC_DIR", "../data/public")
    export_public_cache(db, pub)
