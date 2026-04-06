#!/usr/bin/env python3
"""
Populate imageurls.keywords_visual via Pixtral 12B vision analysis (Option C).
Processes all images without keywords_visual, in batches with checkpointing.
Run on Hetzner: python3 -u /tmp/populate_keywords_visual.py
"""
import base64, json, urllib.request, subprocess, os, sys, time

# Config
STORAGE = "/var/www/api.holidaibutler.com/storage"
CHECKPOINT_FILE = "/tmp/pixtral_checkpoint.json"
BATCH_SIZE = 50  # Save checkpoint every N images
MAX_RETRIES = 2
RATE_LIMIT_DELAY = 0.25  # seconds between API calls

# Load Mistral key
env_content = open("/var/www/api.holidaibutler.com/platform-core/.env").read()
MISTRAL_KEY = [l.split("=",1)[1].strip() for l in env_content.split("\n") if l.startswith("MISTRAL_API_KEY=")][0]

PROMPT = (
    'Analyze this tourism image. Return ONLY valid JSON (no markdown, no backticks, no code fences): '
    '{"description": "1 factual sentence describing what is visible", '
    '"tags": ["5 to 8 visual keywords"], '
    '"mood": "1 word", '
    '"setting": "indoor or outdoor"}'
)

def db_query(sql):
    r = subprocess.run(
        ["mysql", "--no-defaults", "-upxoziy_1", "-pj8,DrtshJSm$",
         "-hjotx.your-database.de", "pxoziy_db1", "-N",
         "--default-character-set=utf8mb4", "-e", sql],
        capture_output=True
    )
    return r.stdout.decode("utf-8", errors="replace").strip().split("\n")

def db_exec(sql):
    subprocess.run(
        ["mysql", "--no-defaults", "-upxoziy_1", "-pj8,DrtshJSm$",
         "-hjotx.your-database.de", "pxoziy_db1",
         "--default-character-set=utf8mb4", "-e", sql],
        capture_output=True
    )

def call_pixtral(image_path):
    """Send image to Pixtral 12B and return parsed result."""
    with open(image_path, "rb") as f:
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

    with urllib.request.urlopen(req, timeout=45) as resp:
        result = json.loads(resp.read())
        content = result["choices"][0]["message"]["content"]
        usage = result.get("usage", {})

        # Clean markdown fences if present
        clean = content.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            clean = clean.rsplit("```", 1)[0].strip()

        parsed = json.loads(clean)
        return parsed, usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)

def escape_sql(s):
    if not s:
        return ""
    return s.replace("\\", "\\\\").replace("'", "\\'").replace('"', '\\"')

# Load checkpoint
processed_ids = set()
if os.path.exists(CHECKPOINT_FILE):
    with open(CHECKPOINT_FILE) as f:
        checkpoint = json.load(f)
        processed_ids = set(checkpoint.get("processed_ids", []))
    print(f"Resumed from checkpoint: {len(processed_ids)} already processed", flush=True)

# Get all images that need processing
print("Loading images to process...", flush=True)
rows = db_query(
    "SELECT id, poi_id, local_path FROM imageurls "
    "WHERE keywords_visual IS NULL AND local_path IS NOT NULL AND file_size > 10000 "
    "ORDER BY poi_id"
)

images = []
for row in rows:
    if not row.strip():
        continue
    parts = row.split("\t")
    if len(parts) >= 3:
        img_id = int(parts[0])
        if img_id not in processed_ids:
            images.append({"id": img_id, "poi_id": int(parts[1]), "path": parts[2]})

print(f"Total to process: {len(images)} images", flush=True)

# Process
total_in = 0
total_out = 0
success = 0
errors = 0
skipped = 0

for idx, img in enumerate(images):
    full_path = STORAGE + img["path"]
    if not os.path.exists(full_path):
        skipped += 1
        processed_ids.add(img["id"])
        continue

    # Skip very large images (>2MB) to avoid API issues
    fsize = os.path.getsize(full_path)
    if fsize > 2_000_000:
        skipped += 1
        processed_ids.add(img["id"])
        continue

    retries = 0
    while retries <= MAX_RETRIES:
        try:
            parsed, tin, tout = call_pixtral(full_path)
            total_in += tin
            total_out += tout

            tags = parsed.get("tags", [])
            desc = parsed.get("description", "")
            mood = parsed.get("mood", "")
            setting = parsed.get("setting", "")

            tags_str = escape_sql(", ".join(tags[:8]))
            desc_str = escape_sql(desc[:500])
            mood_str = escape_sql(mood[:50])
            setting_str = escape_sql(setting[:20])

            db_exec(
                f"UPDATE imageurls SET "
                f"keywords_visual = '{tags_str}', "
                f"visual_description = '{desc_str}', "
                f"visual_mood = '{mood_str}', "
                f"visual_setting = '{setting_str}' "
                f"WHERE id = {img['id']}"
            )
            success += 1
            processed_ids.add(img["id"])
            break

        except urllib.error.HTTPError as e:
            if e.code == 429:  # Rate limited
                wait = min(30, 5 * (retries + 1))
                print(f"  Rate limited, waiting {wait}s...", flush=True)
                time.sleep(wait)
                retries += 1
            else:
                errors += 1
                processed_ids.add(img["id"])
                if errors <= 5:
                    print(f"  HTTP {e.code} for image {img['id']}: {str(e)[:60]}", flush=True)
                break
        except Exception as e:
            errors += 1
            processed_ids.add(img["id"])
            if errors <= 5:
                print(f"  Error for image {img['id']}: {str(e)[:60]}", flush=True)
            break

    time.sleep(RATE_LIMIT_DELAY)

    # Progress + checkpoint
    if (idx + 1) % BATCH_SIZE == 0:
        with open(CHECKPOINT_FILE, "w") as f:
            json.dump({"processed_ids": list(processed_ids)}, f)
        cost = (total_in * 0.15 / 1e6) + (total_out * 0.15 / 1e6)
        print(
            f"  {idx+1}/{len(images)} | "
            f"OK: {success} | Err: {errors} | Skip: {skipped} | "
            f"EUR {cost:.4f}",
            flush=True
        )

# Final checkpoint
with open(CHECKPOINT_FILE, "w") as f:
    json.dump({"processed_ids": list(processed_ids)}, f)

cost = (total_in * 0.15 / 1e6) + (total_out * 0.15 / 1e6)
print(f"\n{'='*50}")
print(f"PIXTRAL BATCH COMPLETE")
print(f"  Success: {success}")
print(f"  Errors: {errors}")
print(f"  Skipped: {skipped}")
print(f"  Tokens: {total_in} in + {total_out} out")
print(f"  Cost: EUR {cost:.4f}")

# Verify
verify = db_query("SELECT COUNT(*) FROM imageurls WHERE keywords_visual IS NOT NULL")
print(f"  Images with keywords_visual: {verify[0].strip()}")
