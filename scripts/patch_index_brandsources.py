#!/usr/bin/env python3
"""
Patch platform-core/src/index.js to mount brandSources routes.

Insertions:
1. Import line after `import adminPortalRoutes from './routes/adminPortal.js';`
2. app.use line after `app.use('/api/v1/admin-portal', adminPortalRoutes);` line

Idempotent: if already patched, exits 0 without changes.
"""
import sys
import re
from pathlib import Path

INDEX_PATH = Path('/var/www/api.holidaibutler.com/platform-core/src/index.js')
IMPORT_LINE = "import brandSourcesRoutes from './routes/brandSources.js';"
MOUNT_LINE = "app.use('/api/v1/admin-portal/brand-sources', brandSourcesRoutes); // Brand Sources (scraping + KB mgmt)"

ANCHOR_IMPORT = "import adminPortalRoutes from './routes/adminPortal.js';"
ANCHOR_MOUNT = "app.use('/api/v1/admin-portal', adminPortalRoutes);"


def main():
    if not INDEX_PATH.exists():
        print(f"ERROR: {INDEX_PATH} not found")
        return 2

    content = INDEX_PATH.read_text(encoding='utf-8')

    # Idempotency check
    already_imported = IMPORT_LINE in content
    already_mounted = "brandSourcesRoutes" in content and "app.use('/api/v1/admin-portal/brand-sources'" in content

    if already_imported and already_mounted:
        print("Already patched. No changes.")
        return 0

    new_content = content

    # 1. Insert import line after ANCHOR_IMPORT
    if not already_imported:
        if ANCHOR_IMPORT not in new_content:
            print(f"ERROR: Anchor not found: {ANCHOR_IMPORT}")
            return 3
        new_content = new_content.replace(
            ANCHOR_IMPORT,
            f"{ANCHOR_IMPORT}\n{IMPORT_LINE}",
            1
        )
        print("Inserted import line.")

    # 2. Insert mount line after ANCHOR_MOUNT (BEFORE the more specific mount to avoid order issues)
    # Note: brand-sources is sub-path of admin-portal. To allow Express to match correctly,
    # mount brand-sources BEFORE admin-portal generic, OR rely on Express matching first match.
    # Express matches in order; sub-router specific path must come BEFORE generic.
    # We'll insert brand-sources mount BEFORE the admin-portal generic mount.
    if not already_mounted:
        if ANCHOR_MOUNT not in new_content:
            print(f"ERROR: Anchor not found: {ANCHOR_MOUNT}")
            return 4

        # Insert MOUNT_LINE BEFORE the anchor (so more specific path takes precedence)
        new_content = new_content.replace(
            ANCHOR_MOUNT,
            f"{MOUNT_LINE}\n{ANCHOR_MOUNT}",
            1
        )
        print("Inserted mount line (before admin-portal generic mount).")

    INDEX_PATH.write_text(new_content, encoding='utf-8')
    print(f"Patched: {INDEX_PATH}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
