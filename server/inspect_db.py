"""Discover all tables in Supabase via OpenAPI schema."""
import os, sys
sys.stdout.reconfigure(encoding='utf-8')

from pathlib import Path
from dotenv import load_dotenv
import httpx, json

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}
REST = f"{SUPABASE_URL}/rest/v1"

# Step 1: Get OpenAPI spec to discover all table names
print("Fetching OpenAPI schema...")
r = httpx.get(f"{REST}/", headers=HEADERS, timeout=15)
print(f"Status: {r.status_code}")

if r.status_code == 200:
    schema = r.json()
    paths = list(schema.get("paths", {}).keys())
    print(f"\nAll available REST endpoints ({len(paths)} total):")
    for p in sorted(paths):
        print(f"  {p}")
else:
    print(f"Failed: {r.text[:500]}")
    sys.exit(1)

# Step 2: For each discovered table, get a sample row
print("\n--- Sampling each table ---")
for path in sorted(paths):
    table = path.strip("/")
    if not table:
        continue
    r2 = httpx.get(f"{REST}/{table}?limit=1", headers=HEADERS, timeout=10)
    if r2.status_code == 200:
        rows = r2.json()
        if rows:
            cols = list(rows[0].keys())
            print(f"\nTABLE: {table}")
            print(f"  Columns: {cols}")
            # Truncate long values for readability
            sample = {k: (str(v)[:80] if v else v) for k, v in rows[0].items()}
            print(f"  Sample : {json.dumps(sample, ensure_ascii=False, indent=4)}")
        else:
            print(f"\nTABLE: {table} (empty)")
    else:
        print(f"\nTABLE: {table} -> {r2.status_code}")
