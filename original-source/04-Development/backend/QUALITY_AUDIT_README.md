# POI Content Quality Audit - User Guide
**Sprint 9.0 - AI-Powered Quality Assessment**

---

## 🎯 What This Script Does

Analyzes **all existing POI descriptions** using Mistral AI to assess quality on 5 criteria:

1. **Informativeness** - Useful, specific information?
2. **Engagement** - Interesting and compelling?
3. **Accuracy** - Factual and objective?
4. **Completeness** - Covers key aspects?
5. **Clarity** - Clear and well-written?

Each POI receives:
- Individual scores (1-10) for each criterion
- Overall quality score (average)
- Recommendation: **KEEP** (≥8), **IMPROVE** (5-7.9), or **REPLACE** (<5)
- List of specific issues found

---

## 💰 Cost & Time

- **Cost:** ~$3 for 1,063 POIs (~$0.003 per POI)
- **Time:** 2-3 hours (with rate limiting to respect API limits)
- **API:** Mistral AI (already configured in `.env`)

---

## 📋 Prerequisites

### 1. Install Dependencies (if not already installed)

```bash
cd "C:\Users\frank\OneDrive\Documenten\AI 2025\HolidAIbutler\HolidaiButler-Platform-Project\04-Development\backend"

npm install node-fetch
```

### 2. Verify `.env` Configuration

Ensure these variables are set in your `.env` file:

```env
# Database
DB_HOST=jotx.your-database.de
DB_PORT=3306
DB_USER=pxoziy_1
DB_PASSWORD=j8,DrtshJSm$
DB_NAME=pxoziy_db1

# Mistral AI
MISTRAL_API_KEY=eTQtvGieP0xN96ubdskRUG0WXcIgcCKA
```

---

## 🚀 How to Run

### Step 1: Navigate to backend directory

```bash
cd "C:\Users\frank\OneDrive\Documenten\AI 2025\HolidAIbutler\HolidaiButler-Platform-Project\04-Development\backend"
```

### Step 2: Run the quality audit

```bash
node quality-audit-poi-content.js
```

### Step 3: Monitor progress

The script will:
- Connect to database
- Add quality columns to POI table (if not exist)
- Process all POIs with descriptions
- Show real-time progress every POI
- Display summary statistics every 100 POIs

**Example output:**
```
🔍 POI Content Quality Audit - Starting...
================================================================================
✅ Connected to database: pxoziy_db1

📋 Preparing database schema...
✅ Database schema ready

📊 Fetching POIs for assessment...
✅ Found 1131 POIs with descriptions

🚀 Starting quality assessment...

Configuration:
  - Batch size: 10 POIs
  - Rate limit: 500ms between batches
  - Scoring: Keep (≥8), Improve (5-7.9), Replace (<5)

  [0.1%] POI 1593: masymas
          Score: 2.4/10 → REPLACE
          Issues: No description, Missing key information, Not informative
  [0.2%] POI 1589: Supermercados Vore
          Score: 2.2/10 → REPLACE
  ...
  [9.4%] POI 1234: Restaurant La Marina
          Score: 8.5/10 → KEEP
  💤 Rate limit pause (500ms)...
  ...
```

---

## 📊 Output & Results

### 1. Database Updates

The script adds/updates these columns in the `POI` table:

```sql
ALTER TABLE POI
  ADD COLUMN content_quality_score DECIMAL(3,1) NULL,
  ADD COLUMN content_quality_data JSON NULL,
  ADD COLUMN content_quality_assessed_at TIMESTAMP NULL;
```

**Example data:**
```sql
SELECT
  id,
  name,
  content_quality_score,
  JSON_EXTRACT(content_quality_data, '$.recommendation') as recommendation
FROM POI
WHERE content_quality_score IS NOT NULL
ORDER BY content_quality_score DESC
LIMIT 10;
```

### 2. Console Report

Displays comprehensive statistics:
- Overall counts (keep, improve, replace)
- Top 10 highest quality POIs
- Bottom 10 lowest quality POIs
- Quality breakdown by category
- Most common issues found
- Action items for next steps

### 3. CSV Export

Generates `quality_audit_report.csv` with all results:

```csv
ID,Name,Category,Subcategory,Description Length,Quality Score,Recommendation,Issues
1593,masymas,Shopping,,0,2.4,replace,"No description, Missing key information"
1589,Supermercados Vore,Shopping,,0,2.2,replace,"No description"
...
```

---

## 🔍 Understanding the Results

### Quality Score Interpretation

| Score | Category | Meaning | Action |
|-------|----------|---------|--------|
| **8.0 - 10.0** | ✅ KEEP | Excellent quality, use as-is | No action needed |
| **5.0 - 7.9** | ⚠️ IMPROVE | Acceptable but could be better | Enhance with more data |
| **0.0 - 4.9** | ❌ REPLACE | Poor quality, not usable | Replace completely |

### Common Issues

The script identifies issues like:
- "No description" - NULL or empty
- "Too generic" - Vague, marketing fluff
- "Missing key information" - Incomplete
- "Poor clarity" - Confusing, unclear
- "Not engaging" - Boring, dry
- "Lacks specifics" - Too general

---

## 📈 Expected Results

Based on initial analysis, you should see approximately:

| Category | Expected Count | Percentage |
|----------|----------------|------------|
| **KEEP (≥8)** | ~700-800 POIs | 60-70% |
| **IMPROVE (5-7.9)** | ~200-300 POIs | 20-25% |
| **REPLACE (<5)** | ~100-200 POIs | 10-15% |

**This means:**
- ~700-800 POIs: Good quality, can use for translations
- ~200-300 POIs: Need enhancement (webscraping + AI)
- ~100-200 POIs: Need complete replacement (Apify + AI)

**Total POIs needing work: ~300-500** (vs original estimate of 518)

---

## 🔄 What to Do After the Audit

### Step 1: Review Results

```bash
# Open CSV in Excel/Google Sheets
start quality_audit_report.csv

# Or query database directly
```

### Step 2: Export POIs Needing Work

```sql
-- Export POIs that need replacement
SELECT id, name, category, description, content_quality_score
FROM POI
WHERE content_quality_score < 5.0
ORDER BY popularity_score DESC;

-- Export POIs that need improvement
SELECT id, name, category, description, content_quality_score
FROM POI
WHERE content_quality_score >= 5.0 AND content_quality_score < 8.0
ORDER BY content_quality_score ASC;
```

### Step 3: Prioritize Enrichment

**Priority 1 (REPLACE):** POIs with score < 5
- Use Apify + 15 reviews
- Generate new descriptions with AI
- Estimated: 100-200 POIs

**Priority 2 (IMPROVE):** POIs with score 5-7.9
- Webscraping from official sources
- Enhance with additional data
- Estimated: 200-300 POIs

**Priority 3 (KEEP):** POIs with score ≥ 8
- Ready for translation
- No action needed
- Estimated: 700-800 POIs

---

## ⚙️ Configuration Options

You can adjust these settings in the script:

```javascript
const CONFIG = {
  BATCH_SIZE: 10,        // POIs per batch (decrease if API errors)
  RATE_LIMIT_MS: 500,    // Milliseconds between batches
  MIN_SCORE_KEEP: 8.0,   // Threshold for "keep"
  MIN_SCORE_IMPROVE: 5.0 // Threshold for "improve"
};
```

**Recommended settings:**
- **Fast mode:** `BATCH_SIZE: 20`, `RATE_LIMIT_MS: 200` (risk of rate limiting)
- **Safe mode:** `BATCH_SIZE: 5`, `RATE_LIMIT_MS: 1000` (slower but stable)
- **Current:** `BATCH_SIZE: 10`, `RATE_LIMIT_MS: 500` (balanced)

---

## 🛠️ Troubleshooting

### Issue: "Mistral API error: 429 Too Many Requests"

**Solution:** Increase `RATE_LIMIT_MS` to 1000 or 2000

```javascript
RATE_LIMIT_MS: 1000 // Wait 1 second between batches
```

### Issue: "Invalid response structure from Mistral AI"

**Solution:** The AI didn't return valid JSON. The script will skip this POI and continue.

### Issue: Database connection failed

**Solution:** Check `.env` credentials and ensure VPN is connected (if required)

### Issue: Script stops mid-way

**Solution:** The script saves progress to database after each POI. You can restart and it will re-assess POIs (overwrites previous scores).

To skip already-assessed POIs, modify the query:

```javascript
// Add this condition to the WHERE clause
AND content_quality_score IS NULL
```

---

## 📊 Sample Queries After Audit

### Count by recommendation

```sql
SELECT
  JSON_UNQUOTE(JSON_EXTRACT(content_quality_data, '$.recommendation')) as recommendation,
  COUNT(*) as count,
  ROUND(AVG(content_quality_score), 2) as avg_score
FROM POI
WHERE content_quality_score IS NOT NULL
GROUP BY recommendation;
```

### Find POIs with specific issues

```sql
SELECT id, name, content_quality_score
FROM POI
WHERE content_quality_data LIKE '%Too generic%'
ORDER BY content_quality_score ASC;
```

### Category performance

```sql
SELECT
  category,
  COUNT(*) as total,
  ROUND(AVG(content_quality_score), 2) as avg_score,
  SUM(CASE WHEN content_quality_score >= 8 THEN 1 ELSE 0 END) as keep_count
FROM POI
WHERE content_quality_score IS NOT NULL
GROUP BY category
ORDER BY avg_score DESC;
```

---

## 💡 Tips

1. **Run during off-peak hours** - The script takes 2-3 hours
2. **Monitor costs** - Check Mistral AI usage dashboard
3. **Review samples** - Manually check 10-20 POIs to validate AI scoring
4. **Adjust thresholds** - If too many "improve", lower MIN_SCORE_IMPROVE
5. **Save CSV** - Keep the CSV report for tracking progress

---

## 🚀 Next Steps After Audit

1. ✅ Run quality audit (this script)
2. ✅ Review results in CSV + database
3. ✅ Identify POIs needing enrichment
4. ✅ Run webscraping for "improve" POIs
5. ✅ Run Apify for "replace" POIs
6. ✅ Translate all "keep" POIs immediately
7. ✅ Translate enriched POIs after enhancement

---

## 📞 Support

**Script location:**
```
C:\Users\frank\OneDrive\Documenten\AI 2025\HolidAIbutler\
HolidaiButler-Platform-Project\04-Development\backend\
quality-audit-poi-content.js
```

**Documentation:**
- Sprint 9.0 Audit Report: `SPRINT_9_0_AUDIT_REPORT.md`
- Webscraping Strategy: `WEBSCRAPING_STRATEGY_AND_QUALITY_CHECK.md`
- This guide: `QUALITY_AUDIT_README.md`

---

**Ready to run!** 🎯

Execute: `node quality-audit-poi-content.js`
