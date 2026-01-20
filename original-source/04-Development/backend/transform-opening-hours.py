"""
Transform opening hours from CSV hourly format to JSON format for database
CSV format: Mo:0:open;Mo:1:open;Mo:2:closed;...
JSON format: {"monday": [{"open": "09:00", "close": "17:00"}], ...}
"""
import csv
import json
import re

CSV_PATH = r'C:\Users\frank\OneDrive\Documenten\AI 2025\HolidAIbutler\HolidaiButler-Platform-Project\03-Architecture\google_places_universal_with_all_qa.csv'
JSON_OUTPUT = r'C:\Users\frank\OneDrive\Documenten\AI 2025\HolidAIbutler\HolidaiButler-Platform-Project\04-Development\backend\poi-opening-hours.json'

DAY_MAP = {
    'Mo': 'monday',
    'Tu': 'tuesday',
    'We': 'wednesday',
    'Th': 'thursday',
    'Fr': 'friday',
    'Sa': 'saturday',
    'Su': 'sunday'
}

def parse_hourly_to_ranges(hourly_string):
    """
    Convert hourly open/closed status to time ranges
    Input: "Mo:0:open;Mo:1:open;Mo:2:closed;..."
    Output: {"monday": [{"open": "00:00", "close": "02:00"}], ...}
    """
    if not hourly_string or hourly_string == 'NULL':
        return None

    # Parse hourly data into dict
    hours_by_day = {day: [False] * 24 for day in DAY_MAP.keys()}

    for entry in hourly_string.split(';'):
        parts = entry.split(':')
        if len(parts) != 3:
            continue

        day_abbr, hour_str, status = parts
        if day_abbr not in hours_by_day:
            continue

        try:
            hour = int(hour_str)
            if 0 <= hour < 24:
                hours_by_day[day_abbr][hour] = (status == 'open')
        except ValueError:
            continue

    # Convert to ranges
    result = {}
    for day_abbr, day_full in DAY_MAP.items():
        hours = hours_by_day[day_abbr]
        ranges = []

        # Find contiguous open periods
        start = None
        for hour in range(24):
            if hours[hour] and start is None:
                # Start of open period
                start = hour
            elif not hours[hour] and start is not None:
                # End of open period
                ranges.append({
                    "open": f"{start:02d}:00",
                    "close": f"{hour:02d}:00"
                })
                start = None

        # Handle open period that extends to end of day
        if start is not None:
            ranges.append({
                "open": f"{start:02d}:00",
                "close": "23:59"
            })

        # Store ranges if not empty
        if ranges:
            result[day_full] = ranges
        else:
            # Explicitly mark closed days
            result[day_full] = []

    return result if result else None

def transform_opening_hours():
    """Main transformation function"""
    print("Reading CSV and transforming opening hours...")

    hours_data = {}
    valid_count = 0
    error_count = 0

    with open(CSV_PATH, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f, delimiter=';')
        headers = next(reader)
        hours_idx = headers.index('google_openinghours')

        for i, row in enumerate(reader, start=2):
            if len(row) <= hours_idx:
                continue

            placeid = row[0].strip()
            if not placeid:
                continue

            hourly_string = row[hours_idx].strip()
            if not hourly_string or hourly_string == 'NULL':
                continue

            try:
                hours_json = parse_hourly_to_ranges(hourly_string)
                if hours_json:
                    hours_data[placeid] = hours_json
                    valid_count += 1

                    if valid_count % 100 == 0:
                        print(f"  Processed {valid_count} opening hours...")

            except Exception as e:
                error_count += 1
                if error_count <= 5:
                    print(f"  ERROR row {i}: {e}")

    print(f"\nTransformation complete!")
    print(f"  Valid opening hours: {valid_count}")
    print(f"  Errors: {error_count}")

    # Write JSON
    print(f"\nWriting to {JSON_OUTPUT}...")
    with open(JSON_OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(hours_data, f, indent=2, ensure_ascii=False)

    print("Done!")

    # Show sample
    if hours_data:
        print("\nSample transformed opening hours:")
        for i, (placeid, hours) in enumerate(list(hours_data.items())[:2]):
            print(f"\n{i+1}. {placeid}")
            print(json.dumps(hours, indent=2))

if __name__ == '__main__':
    transform_opening_hours()
