#!/usr/bin/env python3
"""
A1: Apply ContentItemResource.V1 to GET /content/items/:id detail endpoint (regel 12977).
v4.92 patch landde alleen op LIST endpoint - DETAIL endpoint had geen DTO.

Idempotent.
"""
import sys
from pathlib import Path

PATH = Path('/var/www/api.holidaibutler.com/platform-core/src/routes/adminPortal.js')

# Anchor in detail endpoint (regel ~12997-12999, na JSON parse, vóór legacy resolveer)
ANCHOR = """    // Parse JSON fields
    if (typeof item.seo_data === 'string') item.seo_data = JSON.parse(item.seo_data);
    if (typeof item.social_metadata === 'string') item.social_metadata = JSON.parse(item.social_metadata);
    if (typeof item.media_ids === 'string') item.media_ids = JSON.parse(item.media_ids);
    if (typeof item.keyword_cluster === 'string') item.keyword_cluster = JSON.parse(item.keyword_cluster);

    // Resolve media_ids to image URLs — support both POI (imageurls) and Media Library (media) tables
    const imageBase = process.env.IMAGE_BASE_URL || 'https://test.holidaibutler.com';
    item.resolved_images = [];"""

REPLACEMENT = """    // Parse JSON fields
    if (typeof item.seo_data === 'string') item.seo_data = JSON.parse(item.seo_data);
    if (typeof item.social_metadata === 'string') item.social_metadata = JSON.parse(item.social_metadata);
    if (typeof item.media_ids === 'string') item.media_ids = JSON.parse(item.media_ids);
    if (typeof item.keyword_cluster === 'string') item.keyword_cluster = JSON.parse(item.keyword_cluster);

    // v4.93.0 Fase A1 — DTO/Resource hydration via ContentItemResource (Issue B fix)
    // This endpoint was missing DTO integration (v4.92 patch landde alleen op LIST endpoint)
    let _detailDtoImages = [];
    try {
      const _detailDto = await ContentItemResource.V1(item);
      _detailDtoImages = _detailDto.images || [];
      item.images = _detailDtoImages;
      item.provenance = _detailDto.provenance;
      item._resource_version = 'V1';
    } catch (_dtoErr) {
      logger.warn('[content/items/:id] ContentItemResource.V1 failed: ' + _dtoErr.message);
    }

    // Resolve media_ids to image URLs — support both POI (imageurls) and Media Library (media) tables
    const imageBase = process.env.IMAGE_BASE_URL || 'https://test.holidaibutler.com';
    item.resolved_images = _detailDtoImages.length > 0 ? _detailDtoImages : [];"""


def main():
    if not PATH.exists():
        print(f"ERROR: {PATH} not found"); return 2
    content = PATH.read_text(encoding='utf-8')
    if "v4.93.0 Fase A1" in content:
        print("Already patched."); return 0
    count = content.count(ANCHOR)
    if count == 0:
        print("FAIL: anchor not found"); return 3
    if count > 1:
        print(f"FAIL: anchor not unique ({count}x)"); return 4
    new_content = content.replace(ANCHOR, REPLACEMENT, 1)
    backup = PATH.with_suffix('.js.bak.a1')
    backup.write_text(content, encoding='utf-8')
    PATH.write_text(new_content, encoding='utf-8')
    print("A1: DTO integration applied to /content/items/:id detail endpoint")
    return 0


if __name__ == '__main__':
    sys.exit(main())
