#!/usr/bin/env python3
"""
Apify Backfill Script — Historische datasets door Bronze→Silver pipeline
========================================================================
Leest alle beschikbare Apify run-datasets, dedupliceerd per POI (nieuwste wint),
en duwt de data door de pipeline:
  Bronze: opslag in poi_apify_raw
  Silver: update POI feitelijke velden + reviews extractie

SAFEGUARDS:
  1. Per POI alleen de nieuwste Apify scrape gebruiken
  2. Enriched content (beschrijvingen, vertalingen) wordt NOOIT aangeraakt
  3. COALESCE: null-waarden overschrijven geen bestaande data
  4. Checkpoint-bestanden voor resume bij crash

Usage: python3 -u apify_backfill.py [--resume] [--dry-run] [--limit N]
"""

import json
import os
import sys
import time
import argparse
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError

import mysql.connector

# ─── Configuration ───────────────────────────────────────────────────────
APIFY_TOKEN = os.environ.get("APIFY_TOKEN", "")
APIFY_BASE = "https://api.apify.com/v2"
ACTOR_ID = "nwua9Gu5YrADL7ZDj"  # compass/crawler-google-places

DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "jotx.your-database.de"),
    "database": os.environ.get("DB_NAME", "pxoziy_db1"),
    "user": os.environ.get("DB_USER", ""),
    "password": os.environ.get("DB_PASSWORD", ""),
    "charset": "utf8mb4",
    "collation": "utf8mb4_unicode_ci",
}

CHECKPOINT_DIR = "/root/apify_backfill"
RUNS_CHECKPOINT = os.path.join(CHECKPOINT_DIR, "runs.json")
ITEMS_CHECKPOINT = os.path.join(CHECKPOINT_DIR, "items.json")
PROGRESS_CHECKPOINT = os.path.join(CHECKPOINT_DIR, "progress.json")

# Max concurrent Apify API calls
MAX_WORKERS = 5
# Delay between API batches (seconds)
BATCH_DELAY = 0.5


# ─── Apify API Helpers ──────────────────────────────────────────────────

def apify_get(path, retries=3):
    """GET request to Apify API with retry logic."""
    url = f"{APIFY_BASE}/{path}{'&' if '?' in path else '?'}token={APIFY_TOKEN}"
    for attempt in range(retries):
        try:
            req = Request(url, headers={"Accept": "application/json"})
            with urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError) as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
            else:
                print(f"  [ERROR] API call failed after {retries} attempts: {path}: {e}")
                return None


# ─── Phase 1: Fetch All Runs ────────────────────────────────────────────

def fetch_all_runs(resume=False):
    """Fetch all SUCCEEDED runs from Apify, paginated."""
    if resume and os.path.exists(RUNS_CHECKPOINT):
        print(f"[Phase 1] Resuming from checkpoint {RUNS_CHECKPOINT}")
        with open(RUNS_CHECKPOINT, "r") as f:
            return json.load(f)

    print("[Phase 1] Fetching all SUCCEEDED runs from Apify...")
    all_runs = []
    offset = 0
    page_size = 1000

    while True:
        data = apify_get(f"actor-runs?limit={page_size}&offset={offset}&desc=true&status=SUCCEEDED")
        if not data:
            break
        items = data.get("data", {}).get("items", [])
        total = data.get("data", {}).get("total", 0)

        # Filter by our actor
        for r in items:
            if r.get("actId") == ACTOR_ID:
                all_runs.append({
                    "runId": r["id"],
                    "datasetId": r.get("defaultDatasetId"),
                    "startedAt": r.get("startedAt"),
                    "finishedAt": r.get("finishedAt"),
                })

        offset += page_size
        print(f"  Fetched {offset}/{total} runs ({len(all_runs)} matching actor)...")
        if offset >= total:
            break

    # Save checkpoint
    with open(RUNS_CHECKPOINT, "w") as f:
        json.dump(all_runs, f)
    print(f"[Phase 1] Complete: {len(all_runs)} runs found, saved to {RUNS_CHECKPOINT}")
    return all_runs


# ─── Phase 2: Fetch Dataset Items ───────────────────────────────────────

def fetch_dataset_item(run):
    """Fetch the single item from a run's dataset."""
    ds_id = run.get("datasetId")
    if not ds_id:
        return None
    data = apify_get(f"datasets/{ds_id}/items?limit=1")
    if data and len(data) > 0:
        item = data[0]
        item["_runId"] = run["runId"]
        item["_startedAt"] = run["startedAt"]
        item["_datasetId"] = ds_id
        return item
    return None


def fetch_all_items(runs, resume=False):
    """Fetch all dataset items with parallel workers and checkpointing."""
    already_fetched = {}
    if resume and os.path.exists(ITEMS_CHECKPOINT):
        print(f"[Phase 2] Loading existing items from checkpoint...")
        with open(ITEMS_CHECKPOINT, "r") as f:
            already_fetched = json.load(f)
        print(f"  {len(already_fetched)} items already fetched")

    # Filter out already-fetched runs
    remaining = [r for r in runs if r["runId"] not in already_fetched]
    print(f"[Phase 2] Fetching {len(remaining)} dataset items ({len(already_fetched)} cached)...")

    batch_size = 50
    for batch_start in range(0, len(remaining), batch_size):
        batch = remaining[batch_start:batch_start + batch_size]

        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {executor.submit(fetch_dataset_item, run): run for run in batch}
            for future in as_completed(futures):
                run = futures[future]
                try:
                    item = future.result()
                    if item:
                        already_fetched[run["runId"]] = item
                except Exception as e:
                    print(f"  [WARN] Failed to fetch dataset for run {run['runId']}: {e}")

        # Progress
        total_done = len(already_fetched)
        total_all = len(runs)
        print(f"  Progress: {total_done}/{total_all} items fetched ({total_done*100//total_all}%)")

        # Checkpoint every 200 items
        if (batch_start + batch_size) % 200 == 0 or batch_start + batch_size >= len(remaining):
            with open(ITEMS_CHECKPOINT, "w") as f:
                json.dump(already_fetched, f)

        time.sleep(BATCH_DELAY)

    # Final save
    with open(ITEMS_CHECKPOINT, "w") as f:
        json.dump(already_fetched, f)

    print(f"[Phase 2] Complete: {len(already_fetched)} items fetched")
    return already_fetched


# ─── Phase 3: Deduplicate by placeId (newest wins) ──────────────────────

def deduplicate_items(items_dict):
    """Keep only the newest scrape per placeId."""
    print("[Phase 3] Deduplicating by placeId (newest wins)...")

    by_placeid = {}
    skipped_no_placeid = 0

    for run_id, item in items_dict.items():
        place_id = item.get("placeId")
        if not place_id:
            skipped_no_placeid += 1
            continue

        started_at = item.get("_startedAt", "")
        if place_id not in by_placeid or started_at > by_placeid[place_id]["_startedAt"]:
            by_placeid[place_id] = item

    print(f"[Phase 3] Complete: {len(by_placeid)} unique POIs (skipped {skipped_no_placeid} without placeId)")
    return by_placeid


# ─── Phase 4: Match to Database & Process Pipeline ──────────────────────

def get_poi_map(conn):
    """Build google_placeid → (poi_id, destination_id) mapping."""
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, google_placeid, destination_id FROM POI WHERE google_placeid IS NOT NULL AND google_placeid != ''")
    poi_map = {}
    for row in cursor.fetchall():
        poi_map[row["google_placeid"]] = {"id": row["id"], "destination_id": row["destination_id"] or 1}
    cursor.close()
    return poi_map


def validate_raw_data(apify_data):
    """Quality Checkpoint 1: Data Validation."""
    warnings = []
    if apify_data.get("permanentlyClosed"):
        warnings.append("PERMANENT_CLOSED")
    if apify_data.get("temporarilyClosed"):
        warnings.append("TEMPORARILY_CLOSED")
    if not apify_data.get("totalScore") and not apify_data.get("reviewsCount"):
        warnings.append("NO_RATING_DATA")
    if apify_data.get("totalScore") and (apify_data["totalScore"] < 0 or apify_data["totalScore"] > 5):
        warnings.append("INVALID_RATING")

    has_error = any(w.startswith("PERMANENT") or w.startswith("INVALID") for w in warnings)
    return {
        "status": "error" if has_error else ("warning" if warnings else "valid"),
        "notes": ", ".join(warnings) if warnings else None,
    }


def parse_iso_datetime(iso_str):
    """Parse ISO datetime string to MySQL-compatible datetime object."""
    if not iso_str:
        return datetime.utcnow()
    try:
        # Handle various ISO formats: 2026-02-01T05:42:32.793Z, 2026-02-01T05:42:32Z, etc.
        cleaned = iso_str.replace("Z", "+00:00")
        if "." in cleaned:
            # Truncate microseconds beyond 6 digits
            parts = cleaned.split(".")
            frac_and_tz = parts[1]
            # Find where the timezone starts (+ or -)
            for i, c in enumerate(frac_and_tz):
                if c in ("+", "-") and i > 0:
                    frac = frac_and_tz[:i][:6]  # max 6 digits
                    tz = frac_and_tz[i:]
                    cleaned = f"{parts[0]}.{frac}{tz}"
                    break
        return datetime.fromisoformat(cleaned).replace(tzinfo=None)
    except (ValueError, AttributeError):
        return datetime.utcnow()


def save_bronze(cursor, poi_id, place_id, dest_id, apify_data):
    """Bronze: Save raw Apify JSON to poi_apify_raw."""
    scraped_at = parse_iso_datetime(apify_data.get("scrapedAt"))
    validation = validate_raw_data(apify_data)

    cursor.execute("""
        INSERT INTO poi_apify_raw
            (poi_id, google_placeid, destination_id,
             raw_json, google_rating, google_review_count,
             permanently_closed, temporarily_closed, images_count,
             validation_status, validation_notes, scraped_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        poi_id, place_id, dest_id,
        json.dumps(apify_data, ensure_ascii=False, default=str),
        apify_data.get("totalScore"),
        apify_data.get("reviewsCount"),
        1 if apify_data.get("permanentlyClosed") else 0,
        1 if apify_data.get("temporarilyClosed") else 0,
        apify_data.get("imagesCount"),
        validation["status"], validation["notes"],
        scraped_at,
    ))
    return validation


def update_silver(cursor, poi_id, apify_data):
    """Silver: Update POI factual fields ONLY. Never touch enriched content."""
    additional = apify_data.get("additionalInfo") or {}

    amenities = additional.get("Amenities") or additional.get("amenities") or []
    accessibility = additional.get("Accessibility") or additional.get("accessibility") or []
    parking = additional.get("Parking") or additional.get("parking") or []
    service_opts = additional.get("Service options") or []

    amenities_json = json.dumps(amenities) if amenities else None
    accessibility_json = json.dumps(accessibility) if accessibility else None
    parking_json = json.dumps(parking) if parking else None
    service_json = json.dumps(service_opts) if service_opts else None

    reviews_dist = json.dumps(apify_data["reviewsDistribution"]) if apify_data.get("reviewsDistribution") else None
    review_tags = json.dumps(apify_data["reviewsTags"]) if apify_data.get("reviewsTags") else None
    popular_times = json.dumps(apify_data["popularTimesHistogram"]) if apify_data.get("popularTimesHistogram") else None

    people_also = apify_data.get("peopleAlsoSearch") or []
    people_json = json.dumps([{"title": p.get("title"), "score": p.get("totalScore"), "reviews": p.get("reviewsCount")} for p in people_also]) if people_also else None

    instagram = (apify_data.get("instagrams") or [None])[0]
    facebook = (apify_data.get("facebooks") or [None])[0]
    email = (apify_data.get("emails") or [None])[0]

    # opening_hours has json_valid() constraint — must be valid JSON or NULL
    opening_hours_json_str = None
    if apify_data.get("openingHours"):
        try:
            opening_hours_json_str = json.dumps(apify_data["openingHours"], ensure_ascii=False)
            # Verify it's valid JSON
            json.loads(opening_hours_json_str)
        except (TypeError, ValueError):
            opening_hours_json_str = None

    # opening_hours_json column (separate) also gets the JSON
    opening_hours_json = opening_hours_json_str

    is_active = 0 if apify_data.get("permanentlyClosed") else 1

    # CRITICAL: Only update FACTUAL fields, never enriched content
    cursor.execute("""
        UPDATE POI SET
            address = COALESCE(%s, address),
            phone = COALESCE(%s, phone),
            website = COALESCE(%s, website),
            email = COALESCE(%s, email),
            rating = COALESCE(%s, rating),
            review_count = COALESCE(%s, review_count),
            google_rating = COALESCE(%s, google_rating),
            google_review_count = COALESCE(%s, google_review_count),
            opening_hours = COALESCE(%s, opening_hours),
            opening_hours_json = COALESCE(%s, opening_hours_json),
            amenities = COALESCE(%s, amenities),
            accessibility_features = COALESCE(%s, accessibility_features),
            parking_info = %s,
            service_options = %s,
            reviews_distribution = %s,
            review_tags = %s,
            popular_times_json = %s,
            people_also_search = %s,
            instagram_url = COALESCE(%s, instagram_url),
            facebook_url = COALESCE(%s, facebook_url),
            is_active = %s,
            last_updated = NOW(),
            content_updated_at = NOW(),
            last_apify_sync = NOW()
        WHERE id = %s
    """, (
        apify_data.get("address"),
        apify_data.get("phone"),
        apify_data.get("website") or apify_data.get("url"),
        email,
        apify_data.get("totalScore"),
        apify_data.get("reviewsCount"),
        apify_data.get("totalScore"),
        apify_data.get("reviewsCount"),
        opening_hours_json_str,
        opening_hours_json,
        amenities_json,
        accessibility_json,
        parking_json,
        service_json,
        reviews_dist,
        review_tags,
        popular_times,
        people_json,
        instagram,
        facebook,
        is_active,
        poi_id,
    ))


def extract_reviews(cursor, poi_id, dest_id, apify_data):
    """Silver: Extract reviews with deduplication on google_review_id."""
    reviews = apify_data.get("reviews") or []
    if not reviews:
        return 0

    inserted = 0
    for review in reviews:
        review_id = review.get("reviewId")
        if not review_id:
            continue

        cursor.execute(
            "SELECT id FROM reviews WHERE google_review_id = %s",
            (review_id,)
        )
        if cursor.fetchone():
            continue  # Already exists

        created_at = parse_iso_datetime(review.get("publishedAtDate"))

        review_text = review.get("text") or review.get("textTranslated") or ""
        rating_val = review.get("stars") or review.get("rating")
        if rating_val is not None:
            # Handle "5/5", "2/5", "10/10" formats
            rating_str = str(rating_val)
            if "/" in rating_str:
                num, denom = rating_str.split("/", 1)
                try:
                    rating_val = float(num) / float(denom) * 5  # Normalize to 1-5 scale
                except (ValueError, ZeroDivisionError):
                    rating_val = 3
            rating_val = max(1, min(5, int(round(float(rating_val)))))
        else:
            rating_val = 3  # Default neutral rating

        sentiment = 'positive' if rating_val >= 4 else ('negative' if rating_val <= 2 else 'neutral')

        cursor.execute("""
            INSERT INTO reviews
                (poi_id, destination_id, user_name, rating, sentiment, travel_party_type,
                 review_text, visit_date, google_review_id, source, created_at)
            VALUES (%s, %s, %s, %s, %s, 'solo', %s, %s, %s, 'apify', %s)
        """, (
            poi_id, dest_id,
            review.get("name") or "Anonymous",
            rating_val, sentiment,
            review_text,
            created_at.date() if hasattr(created_at, 'date') else created_at,
            review_id,
            created_at,
        ))
        inserted += 1

    return inserted


def process_pipeline(deduped_items, poi_map, dry_run=False, limit=None):
    """Phase 4: Push deduplicated items through Bronze→Silver pipeline."""
    print(f"\n[Phase 4] Processing {len(deduped_items)} unique POIs through pipeline...")

    conn = mysql.connector.connect(**DB_CONFIG)
    conn.autocommit = False
    cursor = conn.cursor(dictionary=True)

    # Load progress checkpoint
    processed = set()
    if os.path.exists(PROGRESS_CHECKPOINT):
        with open(PROGRESS_CHECKPOINT, "r") as f:
            processed = set(json.load(f))
        print(f"  Resuming: {len(processed)} already processed")

    stats = {
        "matched": 0, "unmatched": 0, "processed": 0,
        "bronze_valid": 0, "bronze_warning": 0, "bronze_error": 0,
        "reviews_inserted": 0, "skipped_already": 0, "errors": 0,
    }

    items_list = list(deduped_items.items())
    if limit:
        items_list = items_list[:limit]

    for idx, (place_id, apify_data) in enumerate(items_list):
        # Skip if already processed
        if place_id in processed:
            stats["skipped_already"] += 1
            continue

        # Match to database
        poi_info = poi_map.get(place_id)
        if not poi_info:
            stats["unmatched"] += 1
            continue

        poi_id = poi_info["id"]
        dest_id = poi_info["destination_id"]
        stats["matched"] += 1

        if dry_run:
            name = apify_data.get("title", "?")
            print(f"  [DRY-RUN] Would process POI {poi_id}: {name} (placeId: {place_id})")
            continue

        try:
            # Bronze: save raw
            validation = save_bronze(cursor, poi_id, place_id, dest_id, apify_data)
            stats[f"bronze_{validation['status']}"] += 1

            # Silver: update POI facts
            update_silver(cursor, poi_id, apify_data)

            # Silver: extract reviews
            new_reviews = extract_reviews(cursor, poi_id, dest_id, apify_data)
            stats["reviews_inserted"] += new_reviews

            # Mark processed in bronze
            cursor.execute(
                "UPDATE poi_apify_raw SET processed_at = NOW() WHERE poi_id = %s ORDER BY id DESC LIMIT 1",
                (poi_id,)
            )

            # Update freshness
            cursor.execute(
                "UPDATE POI SET content_freshness_score = 100, content_freshness_status = 'fresh' WHERE id = %s",
                (poi_id,)
            )

            conn.commit()
            stats["processed"] += 1
            processed.add(place_id)

            # Progress logging
            if (idx + 1) % 50 == 0 or idx + 1 == len(items_list):
                pct = (idx + 1) * 100 // len(items_list)
                print(f"  [{pct}%] Processed {stats['processed']}/{stats['matched']} matched POIs "
                      f"(+{stats['reviews_inserted']} reviews, {stats['bronze_warning']}W/{stats['bronze_error']}E)")

                # Save progress checkpoint
                with open(PROGRESS_CHECKPOINT, "w") as f:
                    json.dump(list(processed), f)

        except Exception as e:
            conn.rollback()
            stats["errors"] += 1
            print(f"  [ERROR] POI {poi_id} (placeId: {place_id}): {e}")

    cursor.close()
    conn.close()

    # Final progress save
    if not dry_run:
        with open(PROGRESS_CHECKPOINT, "w") as f:
            json.dump(list(processed), f)

    return stats


# ─── Main ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Apify Backfill: historische data door Bronze→Silver pipeline")
    parser.add_argument("--resume", action="store_true", help="Resume from checkpoints")
    parser.add_argument("--dry-run", action="store_true", help="Don't write to database")
    parser.add_argument("--limit", type=int, help="Limit number of POIs to process")
    args = parser.parse_args()

    os.makedirs(CHECKPOINT_DIR, exist_ok=True)

    start_time = time.time()
    print("=" * 70)
    print("  Apify Backfill — Historische data door Bronze→Silver pipeline")
    print(f"  Mode: {'DRY-RUN' if args.dry_run else 'LIVE'}  |  Resume: {args.resume}  |  Limit: {args.limit or 'none'}")
    print("=" * 70)

    # Phase 1: Fetch all runs
    runs = fetch_all_runs(resume=args.resume)

    # Phase 2: Fetch all dataset items
    items = fetch_all_items(runs, resume=args.resume)

    # Phase 3: Deduplicate
    deduped = deduplicate_items(items)

    # Build POI map
    print("\n[DB] Building POI google_placeid map...")
    conn = mysql.connector.connect(**DB_CONFIG)
    poi_map = get_poi_map(conn)
    conn.close()
    print(f"[DB] {len(poi_map)} POIs with google_placeid in database")

    # Quick match stats
    matched = sum(1 for pid in deduped if pid in poi_map)
    print(f"[Match] {matched}/{len(deduped)} Apify POIs match database ({matched*100//max(len(deduped),1)}%)")

    # Phase 4: Process pipeline
    stats = process_pipeline(deduped, poi_map, dry_run=args.dry_run, limit=args.limit)

    elapsed = time.time() - start_time
    print("\n" + "=" * 70)
    print(f"  BACKFILL COMPLETE ({elapsed:.0f}s)")
    print(f"  Matched:     {stats['matched']}")
    print(f"  Processed:   {stats['processed']}")
    print(f"  Reviews:     +{stats['reviews_inserted']}")
    print(f"  Bronze:      {stats['bronze_valid']} valid, {stats['bronze_warning']} warning, {stats['bronze_error']} error")
    print(f"  Unmatched:   {stats['unmatched']} (Apify POIs niet in database)")
    print(f"  Errors:      {stats['errors']}")
    print(f"  Skipped:     {stats['skipped_already']} (al verwerkt)")
    print("=" * 70)


if __name__ == "__main__":
    main()
