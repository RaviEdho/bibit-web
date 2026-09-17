"""
Bibit Daily Scheduler
Wakes up daily at 22:30 WIB (UTC+7) to run the delta sync and export public cache.
Supports --now flag for immediate manual triggering.
"""

import os
import sys
import time
from datetime import datetime, timezone, timedelta

from scraper import run_daily_sync

# WIB is UTC+7
WIB = timezone(timedelta(hours=7))

TARGET_HOUR = int(os.environ.get("SCHEDULE_HOUR", "22"))
TARGET_MINUTE = int(os.environ.get("SCHEDULE_MINUTE", "30"))


def main():
    db_path = os.environ.get("BIBIT_DB_PATH", "/app/data/bibit.sqlite")
    public_dir = os.environ.get("BIBIT_PUBLIC_DIR", "/app/data/public")
    workers = int(os.environ.get("SCRAPER_WORKERS", "5"))

    print(f"[*] Bibit Scheduler started.")
    print(f"    - Target time: {TARGET_HOUR:02d}:{TARGET_MINUTE:02d} WIB daily")
    print(f"    - DB path: {db_path}")
    print(f"    - Public dir: {public_dir}")

    # Immediate sync if requested or if cache doesn't exist
    summary_file = os.path.join(public_dir, "summary.json")
    if "--now" in sys.argv or not os.path.exists(summary_file):
        print("[*] Performing initial sync on startup...")
        try:
            run_daily_sync(db_path, public_dir, period="1m", workers=workers)
        except Exception as e:
            print(f"[-] Initial sync failed: {e}")

    last_run_day = None

    while True:
        now_wib = datetime.now(WIB)
        current_day = now_wib.date()

        if (
            now_wib.hour == TARGET_HOUR
            and now_wib.minute == TARGET_MINUTE
            and last_run_day != current_day
        ):
            print(f"\n[*] Scheduled trigger activated at {now_wib.strftime('%Y-%m-%d %H:%M:%S')} WIB")
            try:
                run_daily_sync(db_path, public_dir, period="1m", workers=workers)
                last_run_day = current_day
            except Exception as e:
                print(f"[-] Scheduled sync failed: {e}")
                # Wait 60s before retrying
                time.sleep(60)

        # Check every 20 seconds
        time.sleep(20)


if __name__ == "__main__":
    main()
