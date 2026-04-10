#!/usr/bin/env python3
"""
Fase 7 Diagnostic: Test reviews table schema, data quality, and API endpoint
"""
import pymysql
import json
import subprocess

DB_CONFIG = {
    'host': 'jotx.your-database.de',
    'user': 'pxoziy_1',
    'password': 'j8,DrtshJSm$',
    'database': 'pxoziy_db1',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

def main():
    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()

    print("=" * 60)
    print("FASE 7 DIAGNOSTIC: Reviews Table Analysis")
    print("=" * 60)

    # 1. Full table schema
    print("\n--- 1. FULL TABLE SCHEMA ---")
    cursor.execute("DESCRIBE reviews")
    columns = cursor.fetchall()
    for col in columns:
        print(f"  {col['Field']:25s} {col['Type']:30s} NULL={col['Null']} Default={col['Default']}")

    col_names = [c['Field'] for c in columns]
    print(f"\n  Total columns: {len(columns)}")
    print(f"  Column names: {', '.join(col_names)}")

    # 2. Check which MODEL columns have data
    print("\n--- 2. MODEL COLUMNS DATA CHECK ---")
    cursor.execute("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN user_name IS NOT NULL AND user_name != '' AND user_name != 'Anonymous' THEN 1 ELSE 0 END) as has_user_name,
            SUM(CASE WHEN user_name = 'Anonymous' OR user_name IS NULL THEN 1 ELSE 0 END) as anonymous_user_name,
            SUM(CASE WHEN review_text IS NOT NULL AND review_text != '' THEN 1 ELSE 0 END) as has_review_text,
            SUM(CASE WHEN review_text IS NULL OR review_text = '' THEN 1 ELSE 0 END) as empty_review_text,
            SUM(CASE WHEN sentiment IS NOT NULL AND sentiment != '' THEN 1 ELSE 0 END) as has_sentiment,
            SUM(CASE WHEN sentiment IS NULL OR sentiment = '' THEN 1 ELSE 0 END) as empty_sentiment,
            SUM(CASE WHEN visit_date IS NOT NULL THEN 1 ELSE 0 END) as has_visit_date,
            SUM(CASE WHEN visit_date IS NULL THEN 1 ELSE 0 END) as empty_visit_date,
            SUM(CASE WHEN helpful_count > 0 THEN 1 ELSE 0 END) as has_helpful,
            SUM(CASE WHEN travel_party_type IS NOT NULL AND travel_party_type != '' THEN 1 ELSE 0 END) as has_travel_party
        FROM reviews
    """)
    stats = cursor.fetchone()
    total = stats['total']
    print(f"  Total reviews: {total}")
    print(f"  user_name: {stats['has_user_name']} with real name, {stats['anonymous_user_name']} anonymous/null")
    print(f"  review_text: {stats['has_review_text']} with text, {stats['empty_review_text']} empty/null")
    print(f"  sentiment: {stats['has_sentiment']} with value, {stats['empty_sentiment']} empty/null")
    print(f"  visit_date: {stats['has_visit_date']} with date, {stats['empty_visit_date']} null")
    print(f"  helpful_count > 0: {stats['has_helpful']}")
    print(f"  travel_party_type: {stats['has_travel_party']} with value")

    # 3. Check if MIGRATION columns exist
    print("\n--- 3. MIGRATION COLUMNS CHECK ---")
    migration_cols = ['reviewer_name', 'text', 'sentiment_label', 'sentiment_score', 'review_date', 'review_hash', 'reviewer_photo', 'spam_score', 'last_updated']
    for mc in migration_cols:
        exists = mc in col_names
        if exists:
            cursor.execute(f"SELECT COUNT(*) as cnt FROM reviews WHERE `{mc}` IS NOT NULL AND `{mc}` != ''")
            cnt = cursor.fetchone()['cnt']
            print(f"  {mc:25s} EXISTS  (non-null: {cnt}/{total})")
        else:
            print(f"  {mc:25s} MISSING")

    # 4. Sample reviews (Texel + Calpe)
    print("\n--- 4. SAMPLE TEXEL REVIEWS (5 most recent) ---")
    cursor.execute("""
        SELECT r.id, r.poi_id, p.name as poi_name, r.user_name, r.rating,
               LEFT(r.review_text, 100) as review_preview, r.sentiment,
               r.travel_party_type, r.helpful_count, r.visit_date, r.created_at
        FROM reviews r
        JOIN POI p ON r.poi_id = p.id
        WHERE p.destination_id = 2
        ORDER BY r.created_at DESC
        LIMIT 5
    """)
    for row in cursor.fetchall():
        print(f"  ID={row['id']}, POI={row['poi_id']} ({row['poi_name']})")
        print(f"    user_name={row['user_name']}, rating={row['rating']}, sentiment={row['sentiment']}")
        print(f"    review_text={row['review_preview']}")
        print(f"    travel_party={row['travel_party_type']}, helpful={row['helpful_count']}, visit_date={row['visit_date']}")
        print(f"    created_at={row['created_at']}")
        print()

    print("\n--- 5. SAMPLE CALPE REVIEWS (5 most recent) ---")
    cursor.execute("""
        SELECT r.id, r.poi_id, p.name as poi_name, r.user_name, r.rating,
               LEFT(r.review_text, 100) as review_preview, r.sentiment,
               r.travel_party_type, r.helpful_count, r.visit_date, r.created_at
        FROM reviews r
        JOIN POI p ON r.poi_id = p.id
        WHERE p.destination_id = 1
        ORDER BY r.created_at DESC
        LIMIT 5
    """)
    for row in cursor.fetchall():
        print(f"  ID={row['id']}, POI={row['poi_id']} ({row['poi_name']})")
        print(f"    user_name={row['user_name']}, rating={row['rating']}, sentiment={row['sentiment']}")
        print(f"    review_text={row['review_preview']}")
        print(f"    travel_party={row['travel_party_type']}, helpful={row['helpful_count']}, visit_date={row['visit_date']}")
        print(f"    created_at={row['created_at']}")
        print()

    # 6. Top Texel POIs with reviews (for API testing)
    print("\n--- 6. TOP TEXEL POIs WITH REVIEWS ---")
    cursor.execute("""
        SELECT r.poi_id, p.name, COUNT(r.id) as review_count, ROUND(AVG(r.rating), 1) as avg_rating
        FROM reviews r
        JOIN POI p ON r.poi_id = p.id
        WHERE p.destination_id = 2
        GROUP BY r.poi_id, p.name
        ORDER BY review_count DESC
        LIMIT 10
    """)
    texel_pois = cursor.fetchall()
    for row in texel_pois:
        print(f"  POI {row['poi_id']:5d} ({row['name'][:40]:40s}) — {row['review_count']} reviews, avg {row['avg_rating']}")

    print("\n--- 7. TOP CALPE POIs WITH REVIEWS ---")
    cursor.execute("""
        SELECT r.poi_id, p.name, COUNT(r.id) as review_count, ROUND(AVG(r.rating), 1) as avg_rating
        FROM reviews r
        JOIN POI p ON r.poi_id = p.id
        WHERE p.destination_id = 1
        GROUP BY r.poi_id, p.name
        ORDER BY review_count DESC
        LIMIT 5
    """)
    calpe_pois = cursor.fetchall()
    for row in calpe_pois:
        print(f"  POI {row['poi_id']:5d} ({row['name'][:40]:40s}) — {row['review_count']} reviews, avg {row['avg_rating']}")

    # 8. Sentiment distribution
    print("\n--- 8. SENTIMENT VALUES DISTRIBUTION ---")
    cursor.execute("SELECT sentiment, COUNT(*) as cnt FROM reviews GROUP BY sentiment ORDER BY cnt DESC")
    for row in cursor.fetchall():
        print(f"  {str(row['sentiment']):20s} — {row['cnt']} reviews")

    # 9. Rating distribution
    print("\n--- 9. RATING DISTRIBUTION ---")
    cursor.execute("SELECT rating, COUNT(*) as cnt FROM reviews GROUP BY rating ORDER BY rating DESC")
    for row in cursor.fetchall():
        print(f"  {row['rating']} stars — {row['cnt']} reviews")

    # 10. Destination_id column check
    print("\n--- 10. DESTINATION_ID ON REVIEWS ---")
    if 'destination_id' in col_names:
        cursor.execute("SELECT destination_id, COUNT(*) as cnt FROM reviews GROUP BY destination_id ORDER BY destination_id")
        for row in cursor.fetchall():
            print(f"  destination_id={row['destination_id']} — {row['cnt']} reviews")
    else:
        print("  destination_id column DOES NOT EXIST on reviews table")

    # 11. Test API endpoint
    print("\n--- 11. API ENDPOINT TEST ---")
    if texel_pois:
        test_poi_id = texel_pois[0]['poi_id']
        test_poi_name = texel_pois[0]['name']
        print(f"  Testing POI {test_poi_id} ({test_poi_name})...")

        try:
            result = subprocess.run(
                ['curl', '-s', '-w', '\nHTTP_STATUS:%{http_code}',
                 f'https://api.holidaibutler.com/api/v1/pois/{test_poi_id}/reviews?limit=3&sort=recent',
                 '-H', 'X-Destination-ID: texel'],
                capture_output=True, text=True, timeout=15
            )
            output = result.stdout
            # Split HTTP status from body
            parts = output.rsplit('\nHTTP_STATUS:', 1)
            body = parts[0]
            status = parts[1] if len(parts) > 1 else 'unknown'
            print(f"  HTTP Status: {status}")

            try:
                data = json.loads(body)
                print(f"  Success: {data.get('success')}")
                print(f"  Total: {data.get('total')}")
                if data.get('data') and len(data['data']) > 0:
                    first = data['data'][0]
                    print(f"  First review:")
                    print(f"    id={first.get('id')}")
                    print(f"    user_name={first.get('user_name')}")
                    print(f"    rating={first.get('rating')}")
                    print(f"    review_text={str(first.get('review_text', ''))[:100]}")
                    print(f"    sentiment={first.get('sentiment')}")
                    print(f"    helpful_count={first.get('helpful_count')}")
                    print(f"    visit_date={first.get('visit_date')}")
                    print(f"    created_at={first.get('created_at')}")
                else:
                    print(f"  Data array: {data.get('data')}")
                    if data.get('message'):
                        print(f"  Message: {data.get('message')}")
            except json.JSONDecodeError:
                print(f"  Raw response (first 500 chars): {body[:500]}")
        except Exception as e:
            print(f"  API test failed: {e}")

        # Test summary endpoint
        print(f"\n  Testing summary for POI {test_poi_id}...")
        try:
            result = subprocess.run(
                ['curl', '-s', '-w', '\nHTTP_STATUS:%{http_code}',
                 f'https://api.holidaibutler.com/api/v1/pois/{test_poi_id}/reviews/summary',
                 '-H', 'X-Destination-ID: texel'],
                capture_output=True, text=True, timeout=15
            )
            output = result.stdout
            parts = output.rsplit('\nHTTP_STATUS:', 1)
            body = parts[0]
            status = parts[1] if len(parts) > 1 else 'unknown'
            print(f"  HTTP Status: {status}")
            try:
                data = json.loads(body)
                print(f"  Success: {data.get('success')}")
                if data.get('data'):
                    d = data['data']
                    print(f"  avg_rating: {d.get('average_rating')}")
                    print(f"  total_count: {d.get('total_count')}")
                    print(f"  sentiment: {d.get('sentiment_breakdown')}")
                    print(f"  party: {d.get('party_breakdown')}")
            except json.JSONDecodeError:
                print(f"  Raw: {body[:500]}")
        except Exception as e:
            print(f"  Summary test failed: {e}")

    cursor.close()
    conn.close()
    print("\n" + "=" * 60)
    print("DIAGNOSTIC COMPLETE")
    print("=" * 60)

if __name__ == '__main__':
    main()
