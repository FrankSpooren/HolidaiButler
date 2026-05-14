#!/usr/bin/env python3
"""Add cross-references to Fase_B_Multi_Tenant_Scale_Command.md in CLAUDE.md + Master Strategie."""
import sys
from pathlib import Path

CLAUDE = Path('/var/www/api.holidaibutler.com/CLAUDE.md')
MS = Path('/var/www/api.holidaibutler.com/docs/strategy/HolidaiButler_Master_Strategie.md')

CLAUDE_A = "## 🚀 Strategische Roadmap"
CLAUDE_R = """## 🚀 Strategische Roadmap

> **Actieve referentie**: `docs/strategy/Fase_B_Multi_Tenant_Scale_Command.md` (v1.0, 14-05-2026) — bevat 7 work-blokken voor Fase A residual gaps + Fase B Multi-Tenant Scale + v4.94+ UX/Compliance. Verwijs naar dit document in elke nieuwe sessie. Approval gates per blok verplicht."""

MS_A = "## Deel 3: Openstaande Fasen - Instructies"
MS_R = """## Deel 3: Openstaande Fasen - Instructies

> **Hoofdreferentie voor v4.94+**: `docs/strategy/Fase_B_Multi_Tenant_Scale_Command.md` (v1.0, 14-05-2026). Bevat 7 work-blokken met acceptance criteria + USP-impact (EU-First + tourism niche) + risico + rollback per blok. Per-blok approval gates verplicht."""


def patch(path, anchor, replacement):
    if not path.exists():
        return f"{path}: NOT FOUND"
    content = path.read_text(encoding='utf-8')
    if replacement in content:
        return f"{path}: already patched"
    if anchor not in content:
        return f"{path}: anchor not found"
    new_content = content.replace(anchor, replacement, 1)
    path.write_text(new_content, encoding='utf-8')
    return f"{path}: patched"


def main():
    print(patch(CLAUDE, CLAUDE_A, CLAUDE_R))
    print(patch(MS, MS_A, MS_R))
    return 0


if __name__ == '__main__':
    sys.exit(main())
