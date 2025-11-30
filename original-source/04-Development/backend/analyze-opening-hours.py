"""
Analyze opening_hours data from CSV to understand format
"""
import csv

CSV_PATH = r'C:\Users\frank\OneDrive\Documenten\AI 2025\HolidAIbutler\HolidaiButler-Platform-Project\03-Architecture\google_places_universal_with_all_qa.csv'

with open(CSV_PATH, 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f, delimiter=';')
    headers = next(reader)

    hours_idx = headers.index('google_openinghours')
    print(f"Opening hours column index: {hours_idx}\n")
    print("Sample opening hours values from CSV:\n")
    print("="*80)

    count = 0
    for i, row in enumerate(reader, start=2):
        if len(row) > hours_idx and row[hours_idx] and row[hours_idx] != 'NULL' and row[hours_idx].strip():
            placeid = row[0][:40] if len(row) > 0 else 'Unknown'
            hours = row[hours_idx][:300]
            print(f"\nRow {i}:")
            print(f"  PlaceID: {placeid}")
            print(f"  Hours data: {hours}")
            count += 1

            if count >= 5:
                break

    if count == 0:
        print("\nNo opening hours data found in CSV!")

    print("\n" + "="*80)
    print(f"Total samples shown: {count}")
