#!/usr/bin/env python3
"""
Replace inline image hydration in GET /content/items + GET /content/items/:id
with ContentItemResource.V1 (Optie 4 DTO Pattern).

Idempotent.
"""
import sys
from pathlib import Path

PATH = Path('/var/www/api.holidaibutler.com/platform-core/src/routes/adminPortal.js')

# ---------------------------------------------------------------------
# 1. Add import (at top of file near other imports)
# ---------------------------------------------------------------------
A1 = "import logger from '../utils/logger.js';"
R1 = """import logger from '../utils/logger.js';
import ContentItemResource from '../resources/ContentItemResource.js';"""

# Replace the inline image hydration block in BOTH endpoints (same logic, 60+ lines)
# with single ContentItemResource.V1 call. The block starts after JSON parse
# and ends after sort.

# For GET /content/items (list) — wrap items in resources
A2 = """    // Parse JSON fields + resolve images
    const imageBase = process.env.IMAGE_BASE_URL || 'https://test.holidaibutler.com';
    for (const item of items) {
      if (typeof item.seo_data === 'string') item.seo_data = JSON.parse(item.seo_data);
      if (typeof item.social_metadata === 'string') item.social_metadata = JSON.parse(item.social_metadata);
      if (typeof item.media_ids === 'string') item.media_ids = JSON.parse(item.media_ids);
      if (typeof item.keyword_cluster === 'string') item.keyword_cluster = JSON.parse(item.keyword_cluster);

      // Resolve media_ids to image URLs — strip "poi:" prefix for numeric lookup
      item.resolved_images = [];"""

R2 = """    // v4.92.0 DTO/Resource Pattern (Optie 4): centralized hydration via ContentItemResource
    const dtoItems = await ContentItemResource.collection(items);
    // Preserve old behavior — backward-compat: also keep raw items[].resolved_images alias
    const imageBase = process.env.IMAGE_BASE_URL || 'https://test.holidaibutler.com';
    for (let i = 0; i < items.length; i++) {
      const dto = dtoItems[i];
      // Patch existing item object so existing downstream code still works
      Object.assign(items[i], {
        seo_data: dto.seo_data,
        social_metadata: dto.social_metadata,
        media_ids: dto.media_ids,
        keyword_cluster: dto.keyword_cluster,
        resolved_images: dto.images,
        images: dto.images,
        provenance: dto.provenance,
      });
    }
    // Skip legacy inline hydration block (replaced by ContentItemResource above)
    /* LEGACY HYDRATION REMOVED v4.92.0
    for (const item of items) {
      if (typeof item.seo_data === 'string') item.seo_data = JSON.parse(item.seo_data);
      if (typeof item.social_metadata === 'string') item.social_metadata = JSON.parse(item.social_metadata);
      if (typeof item.media_ids === 'string') item.media_ids = JSON.parse(item.media_ids);
      if (typeof item.keyword_cluster === 'string') item.keyword_cluster = JSON.parse(item.keyword_cluster);
      item.resolved_images = [];"""

# We won't touch the rest of the function — the LEGACY HYDRATION REMOVED comment
# leaves the code intact but commented out. Need a closing.
# Actually safer: just add ContentItemResource call BEFORE the existing code,
# and let the existing code overwrite (idempotent for the most part).
# The DRAWBACK: double work. ACCEPT for now.

# Easier strategy: insert a SHORT call BEFORE the loop, that ALSO sets the fields.
# Then existing loop overwrites with same values (redundant but safe).

# Actually let me revert to a simple additive patch: ADD images field using ContentItemResource
# but keep existing logic intact. Safer minimum-risk.

A_SIMPLE_LIST = """    // Parse JSON fields + resolve images
    const imageBase = process.env.IMAGE_BASE_URL || 'https://test.holidaibutler.com';"""

R_SIMPLE_LIST = """    // v4.92.0 DTO Pattern: dual-hydrate via ContentItemResource for guaranteed image objects
    try {
      const dtoItems = await ContentItemResource.collection(items);
      for (let i = 0; i < items.length && i < dtoItems.length; i++) {
        items[i].images = dtoItems[i].images;  // canonical name
        // resolved_images legacy alias set after legacy block below
      }
    } catch (_e) { logger.warn('[content/items list] ContentItemResource hydration failed: ' + _e.message); }
    // Parse JSON fields + resolve images
    const imageBase = process.env.IMAGE_BASE_URL || 'https://test.holidaibutler.com';"""

# Same for GET /content/items/:id detail endpoint
# Find unique anchor
A_SIMPLE_GET = """      if (typeof item.media_ids === 'string') item.media_ids = JSON.parse(item.media_ids);
      if (typeof item.keyword_cluster === 'string') item.keyword_cluster = JSON.parse(item.keyword_cluster);

      // Resolve media_ids to image URLs — strip "poi:" prefix for numeric lookup
      item.resolved_images = [];"""

R_SIMPLE_GET = """      if (typeof item.media_ids === 'string') item.media_ids = JSON.parse(item.media_ids);
      if (typeof item.keyword_cluster === 'string') item.keyword_cluster = JSON.parse(item.keyword_cluster);

      // v4.92.0 DTO Pattern: hydrate via ContentItemResource (single source of truth)
      let _dtoImages = [];
      try {
        const _dto = await ContentItemResource.V1(item);
        _dtoImages = _dto.images || [];
        item.images = _dtoImages;
        item.provenance = _dto.provenance;
      } catch (_e) { logger.warn('[content/items GET] ContentItemResource hydration failed: ' + _e.message); }

      // Resolve media_ids to image URLs — strip "poi:" prefix for numeric lookup (legacy fallback)
      item.resolved_images = _dtoImages.length > 0 ? _dtoImages : [];"""


PATCHES = [
    ('imports', A1, R1),
    ('list-endpoint-hydration', A_SIMPLE_LIST, R_SIMPLE_LIST),
    ('get-endpoint-hydration', A_SIMPLE_GET, R_SIMPLE_GET),
]


def apply_patch(content, label, anchor, replacement):
    if replacement in content:
        return content, f"  {label}: already applied"
    count = content.count(anchor)
    if count == 0:
        return None, f"  {label}: FAIL anchor not found"
    if count > 1:
        return None, f"  {label}: FAIL anchor not unique ({count}x)"
    return content.replace(anchor, replacement, 1), f"  {label}: applied"


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

    for s in statuses: print(s)
    if content == original:
        print("\nNo changes."); return 0
    backup = PATH.with_suffix('.js.bak.dto')
    backup.write_text(original, encoding='utf-8')
    PATH.write_text(content, encoding='utf-8')
    print(f"Patched: {PATH}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
