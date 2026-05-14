#!/usr/bin/env python3
"""
ConceptDialog.jsx v4.91.1 fixes:

C. handleImprove: update editBody from response body on ALL paths (not just improved=true)
   Voorkomt dat bullets/em-dash in origineel zichtbaar blijven na AI Herschrijven.

D. Score display priority: improveResult.final_score > improveResult.seo_score > seoData.overallScore
   Voorkomt stale seoData display ("66 → 59" bug).

Punt 2: prefer response.body (new) over body_en/body_nl chain.

Idempotent.
"""
import sys
from pathlib import Path

PATH = Path('/var/www/api.holidaibutler.com/admin-module/src/components/content/ConceptDialog.jsx')

# ---------------------------------------------------------------------
# C: handleImprove — update editBody on all paths
# ---------------------------------------------------------------------
A1 = """  const handleImprove = async () => {
    if (!activeItem) return;
    setImproving(true);
    setImproveResult(null);
    try {
      const r = await contentService.improveItem(activeItem.id);
      const data = r.data || r;
      setImproveResult(data);
      if (data.improved) {
        const refreshed = await contentService.getItem(activeItem.id);
        const itemData = refreshed.data || refreshed;
        setItems(prev => prev.map(i => i.id === activeItem.id ? { ...i, ...itemData } : i));
        setEditBody(cleanBodyForDisplay(itemData[`body_${langTab}`] || itemData.body_en || ''));
        // Reload SEO score to stay consistent
        await loadSeoScore(activeItem.id, activeItem.target_platform);
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      setImproveResult({ improved: false, reason: err.message });
    } finally {
      setImproving(false);
    }
  };"""

R1 = """  const handleImprove = async () => {
    if (!activeItem) return;
    setImproving(true);
    setImproveResult(null);
    try {
      const r = await contentService.improveItem(activeItem.id);
      const data = r.data || r;
      setImproveResult(data);

      // v4.91.1 Fix C + Punt 2: ALWAYS update editBody when response provides a body
      // (op alle paden: SUCCESS, SCORE_ALREADY_HIGH, AI_UNABLE) — bullets/em-dash worden
      // gestript ook al kon AI niet verbeteren. Prefer language-neutral `body` field.
      const respBody = data.body || data.body_en || data.body_nl;
      if (respBody && typeof respBody === 'string' && respBody.length > 0) {
        setEditBody(cleanBodyForDisplay(respBody));
        setDirty(true); // markeer als gewijzigd zodat Save knop actief wordt
      }

      if (data.improved) {
        const refreshed = await contentService.getItem(activeItem.id);
        const itemData = refreshed.data || refreshed;
        setItems(prev => prev.map(i => i.id === activeItem.id ? { ...i, ...itemData } : i));
        // Reload SEO score to stay consistent
        await loadSeoScore(activeItem.id, activeItem.target_platform);
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      setImproveResult({ improved: false, reason: err.message });
    } finally {
      setImproving(false);
    }
  };"""

# ---------------------------------------------------------------------
# D: Score display priority — fix occurrence 1 (regel ~1255)
# ---------------------------------------------------------------------
A2 = """                            final: seoData?.overallScore ?? improveResult.final_score ?? improveResult.seo_score ?? '?',"""

R2 = """                            final: improveResult.final_score ?? improveResult.seo_score ?? seoData?.overallScore ?? '?',"""


PATCHES = [
    ('Fix-C-handleImprove-allPaths', A1, R1),
    ('Fix-D-score-priority', A2, R2),
]


def apply_patch(content, label, anchor, replacement):
    if replacement in content:
        return content, f"  {label}: already applied (skip)"
    count = content.count(anchor)
    if count == 0:
        return None, f"  {label}: FAIL anchor not found"
    return content.replace(anchor, replacement), f"  {label}: applied ({count}x)"


def main():
    if not PATH.exists():
        print(f"ERROR: {PATH} not found"); return 2
    original = PATH.read_text(encoding='utf-8')
    content = original
    statuses = []
    for label, anchor, replacement in PATCHES:
        new_content, status = apply_patch(content, label, anchor, replacement)
        statuses.append(status)
        if new_content is None and 'already applied' not in status:
            for s in statuses: print(s)
            return 3
        if new_content: content = new_content

    print("v4.91.1 frontend patches:")
    for s in statuses: print(s)
    if content == original:
        print("\nNo changes."); return 0
    backup = PATH.with_suffix('.jsx.bak.v4911')
    backup.write_text(original, encoding='utf-8')
    PATH.write_text(content, encoding='utf-8')
    print(f"\nPatched: {PATH}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
