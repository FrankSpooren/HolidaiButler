#!/usr/bin/env python3
"""
Pixtral 12B Benchmark — Stratified sample of 96 POIs across 6 categories.
Compares Option B (Google/Apify metadata) vs Option C (AI vision tags).
Run on Hetzner: python3 -u /tmp/pixtral_benchmark.py
"""
import base64, json, urllib.request, random, time, os, subprocess, sys

# Load Mistral key
env_content = open("/var/www/api.holidaibutler.com/platform-core/.env").read()
MISTRAL_KEY = [l.split("=",1)[1].strip() for l in env_content.split("\n") if l.startswith("MISTRAL_API_KEY=")][0]

STORAGE = "/var/www/api.holidaibutler.com/storage"

def db_query(sql):
    r = subprocess.run(
        ["mysql", "--no-defaults", "-upxoziy_1", "-pj8,DrtshJSm$", "-hjotx.your-database.de", "pxoziy_db1", "-N", "--default-character-set=utf8mb4", "-e", sql],
        capture_output=True
    )
    stdout = r.stdout.decode("utf-8", errors="replace")
    return [line.split("\t") for line in stdout.strip().split("\n") if line.strip()]

# 1. Stratified sample
SAMPLE = {
    "Food & Drinks": 20,
    "Beaches & Nature": 20,
    "Culture & History": 20,
    "Shopping": 15,
    "Active": 15,
    "Recreation": 10,
}

all_pois = []
for cat, n in SAMPLE.items():
    rows = db_query(
        f'SELECT p.id, p.name, p.category, p.subcategory, '
        f'SUBSTRING(i.local_path, 1, 120), p.google_placeid '
        f'FROM POI p JOIN imageurls i ON i.poi_id = p.id '
        f'WHERE p.destination_id = 1 AND p.category = "{cat}" '
        f'AND i.local_path IS NOT NULL AND i.file_size > 30000 '
        f'GROUP BY p.id ORDER BY RAND() LIMIT {n * 2}'
    )
    random.shuffle(rows)
    selected = rows[:n]
    all_pois.extend(selected)
    print(f"  {cat}: {len(selected)}/{n} POIs selected", flush=True)

print(f"\nTotal: {len(all_pois)} POIs", flush=True)

# 2. Load Apify metadata
apify_data = {}
for row in all_pois:
    pid = row[0]
    rows = db_query(
        f'SELECT JSON_UNQUOTE(JSON_EXTRACT(raw_json, "$.categoryName")), '
        f'JSON_EXTRACT(raw_json, "$.reviewsTags"), '
        f'JSON_EXTRACT(raw_json, "$.additionalInfo.Atmosphere") '
        f'FROM poi_apify_raw WHERE poi_id = {pid} ORDER BY scraped_at DESC LIMIT 1'
    )
    if rows and rows[0]:
        cat_name = rows[0][0] if rows[0][0] != "NULL" else ""
        try:
            tags = json.loads(rows[0][1]) if len(rows[0]) > 1 and rows[0][1] != "NULL" else []
            tag_titles = [t.get("title","") for t in tags if isinstance(t, dict)][:8]
        except:
            tag_titles = []
        atm_labels = []
        if len(rows[0]) > 2 and rows[0][2] not in ("NULL", None, ""):
            try:
                atm = json.loads(rows[0][2])
                if isinstance(atm, list):
                    for a in atm:
                        if isinstance(a, dict):
                            atm_labels.extend([k for k,v in a.items() if v])
                elif isinstance(atm, dict):
                    atm_labels = [k for k,v in atm.items() if v]
            except:
                pass
        apify_data[int(pid)] = {"categoryName": cat_name, "reviewsTags": tag_titles, "atmosphere": atm_labels}

print(f"Apify metadata: {len(apify_data)}/{len(all_pois)} POIs have data", flush=True)

# 3. Pixtral 12B calls
PROMPT = (
    'Analyze this tourism image. Return ONLY valid JSON (no markdown, no backticks, no code fences): '
    '{"description": "1 factual sentence describing what is visible", '
    '"tags": ["5 to 8 visual keywords"], '
    '"mood": "1 word", '
    '"setting": "indoor or outdoor", '
    '"time_of_day": "morning or afternoon or evening or night or unknown"}'
)

results = []
total_in = 0
total_out = 0
errors = 0
parse_errors = 0

for idx, row in enumerate(all_pois):
    poi_id = int(row[0])
    name = row[1]
    category = row[2]
    subcategory = row[3]
    img_path = row[4]
    gplaceid = row[5] if len(row) > 5 else ""

    full_path = STORAGE + img_path
    if not os.path.exists(full_path):
        errors += 1
        continue

    with open(full_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    payload = json.dumps({
        "model": "pixtral-12b-2409",
        "messages": [{"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + b64}},
            {"type": "text", "text": PROMPT}
        ]}],
        "max_tokens": 200,
        "temperature": 0.1
    }).encode()

    req = urllib.request.Request(
        "https://api.mistral.ai/v1/chat/completions",
        data=payload,
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + MISTRAL_KEY}
    )

    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            result = json.loads(resp.read())
            content = result["choices"][0]["message"]["content"]
            usage = result.get("usage", {})
            total_in += usage.get("prompt_tokens", 0)
            total_out += usage.get("completion_tokens", 0)

            # Parse output
            clean = content.strip()
            if clean.startswith("```"):
                clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
                clean = clean.rsplit("```", 1)[0].strip()

            pe = False
            try:
                parsed = json.loads(clean)
            except:
                parsed = {"description": content[:200], "tags": []}
                pe = True
                parse_errors += 1

            # Build Option B keywords
            apify = apify_data.get(poi_id, {})
            ob = []
            if apify.get("categoryName"):
                ob.append(apify["categoryName"])
            if subcategory:
                ob.append(subcategory)
            ob.extend(apify.get("reviewsTags", [])[:5])
            ob.extend(apify.get("atmosphere", []))

            results.append({
                "poi_id": poi_id,
                "name": name,
                "category": category,
                "subcategory": subcategory or "",
                "option_b": [k for k in ob if k],
                "option_c_tags": parsed.get("tags", []),
                "option_c_desc": parsed.get("description", ""),
                "option_c_mood": parsed.get("mood", ""),
                "option_c_setting": parsed.get("setting", ""),
                "option_c_time": parsed.get("time_of_day", ""),
                "parse_error": pe,
                "has_apify": bool(apify),
            })
    except Exception as e:
        errors += 1
        results.append({"poi_id": poi_id, "name": name, "category": category, "error": str(e)[:80]})

    if (idx + 1) % 10 == 0:
        print(f"  {idx+1}/{len(all_pois)} done ({errors} errors, {parse_errors} parse errors)", flush=True)

    time.sleep(0.3)

# 4. Save + summary
with open("/tmp/pixtral_benchmark_results.json", "w") as f:
    json.dump({"results": results, "tokens_in": total_in, "tokens_out": total_out, "errors": errors, "parse_errors": parse_errors}, f, indent=2, ensure_ascii=False)

print(f"\n{'='*50}")
print(f"BENCHMARK COMPLETE")
print(f"  Processed: {len(results)}")
print(f"  API errors: {errors}")
print(f"  JSON parse errors: {parse_errors}")
print(f"  Tokens: {total_in} in, {total_out} out")
cost = (total_in * 0.15 / 1_000_000) + (total_out * 0.15 / 1_000_000)
print(f"  Cost: EUR {cost:.4f}")
print(f"  Results saved: /tmp/pixtral_benchmark_results.json")

# 5. Quick quality stats
valid = [r for r in results if "error" not in r]
has_apify_count = sum(1 for r in valid if r.get("has_apify"))
avg_tags_c = sum(len(r.get("option_c_tags",[])) for r in valid) / max(len(valid),1)
avg_tags_b = sum(len(r.get("option_b",[])) for r in valid) / max(len(valid),1)
settings = {}
for r in valid:
    s = r.get("option_c_setting", "unknown")
    settings[s] = settings.get(s, 0) + 1
moods = {}
for r in valid:
    m = r.get("option_c_mood", "unknown")
    moods[m] = moods.get(m, 0) + 1

print(f"\n  POIs with Apify data: {has_apify_count}/{len(valid)}")
print(f"  Avg Option B keywords: {avg_tags_b:.1f}")
print(f"  Avg Option C tags: {avg_tags_c:.1f}")
print(f"  Settings: {json.dumps(settings)}")
print(f"  Top moods: {json.dumps(dict(sorted(moods.items(), key=lambda x: -x[1])[:8]))}")
