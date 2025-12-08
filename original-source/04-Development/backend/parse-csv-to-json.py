"""
CSV to JSON Parser for POI Data
Converts Google Places CSV to JSON for database enrichment
"""

import csv
import json
import sys

CSV_PATH = r'C:\Users\frank\OneDrive\Documenten\AI 2025\HolidAIbutler\HolidaiButler-Platform-Project\03-Architecture\google_places_universal_with_all_qa.csv'
JSON_OUTPUT = r'C:\Users\frank\OneDrive\Documenten\AI 2025\HolidAIbutler\HolidaiButler-Platform-Project\04-Development\backend\poi-enrichment-data.json'

# Column indices based on analysis
COLS = {
    'PLACEID': 0,
    'RATING': 21,
    'REVIEW_COUNT': 22,
    'ONE_STAR': 23,
    'TWO_STAR': 24,
    'THREE_STAR': 25,
    'FOUR_STAR': 26,
    'FIVE_STAR': 27,
    'IMAGE_URL': 31,
    'OPENING_HOURS': 32
}

def safe_float(value):
    """Safely convert to float"""
    if not value or value == '' or value == 'NULL':
        return None
    try:
        return float(value)
    except ValueError:
        return None

def safe_int(value):
    """Safely convert to int"""
    if not value or value == '' or value == 'NULL':
        return None
    try:
        return int(value)
    except ValueError:
        return 0

def safe_string(value):
    """Safely get string value"""
    if not value or value == '' or value == 'NULL':
        return None
    return value.strip()

def parse_csv():
    """Parse CSV and extract POI enrichment data"""
    print("Reading CSV file...")

    data_map = {}
    valid_rows = 0

    with open(CSV_PATH, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f, delimiter=';')

        # Skip header
        next(reader)

        for row_num, row in enumerate(reader, start=2):
            try:
                if len(row) <= max(COLS.values()):
                    print(f"WARNING Row {row_num}: Insufficient columns ({len(row)}), skipping")
                    continue

                placeid = safe_string(row[COLS['PLACEID']])
                if not placeid:
                    continue

                # Extract all relevant data
                rating = safe_float(row[COLS['RATING']])
                review_count = safe_int(row[COLS['REVIEW_COUNT']])
                image_url = safe_string(row[COLS['IMAGE_URL']])
                opening_hours = safe_string(row[COLS['OPENING_HOURS']])

                # Only include if we have meaningful data
                if rating is None and review_count is None and image_url is None and opening_hours is None:
                    continue

                data_map[placeid] = {
                    'placeid': placeid,
                    'rating': rating,
                    'reviewCount': review_count,
                    'oneStar': safe_int(row[COLS['ONE_STAR']]),
                    'twoStar': safe_int(row[COLS['TWO_STAR']]),
                    'threeStar': safe_int(row[COLS['THREE_STAR']]),
                    'fourStar': safe_int(row[COLS['FOUR_STAR']]),
                    'fiveStar': safe_int(row[COLS['FIVE_STAR']]),
                    'imageUrl': image_url,
                    'openingHours': opening_hours
                }

                valid_rows += 1

                if valid_rows % 100 == 0:
                    print(f"  Processed {valid_rows} valid records...")

            except Exception as e:
                print(f"ERROR on row {row_num}: {e}")
                continue

    print(f"\nParsed {valid_rows} valid POI records from CSV")
    print(f"Writing to {JSON_OUTPUT}...")

    with open(JSON_OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(data_map, f, indent=2, ensure_ascii=False)

    print(f"JSON file created successfully!")
    print(f"   Total records: {len(data_map)}")

    # Show sample
    print("\nSample records:")
    for i, (placeid, data) in enumerate(list(data_map.items())[:3]):
        print(f"\n{i+1}. {placeid}")
        print(f"   Rating: {data['rating']}")
        print(f"   Reviews: {data['reviewCount']}")
        print(f"   Image: {data['imageUrl'][:50] if data['imageUrl'] else 'None'}...")
        print(f"   Hours: {data['openingHours'][:50] if data['openingHours'] else 'None'}...")

if __name__ == '__main__':
    try:
        parse_csv()
        sys.exit(0)
    except Exception as e:
        print(f"FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
