#!/usr/bin/env python3
"""
Voeg Stream Timeout Prevention block toe aan CLAUDE.md vóór Enterprise Kwaliteitsstandaarden.
"""
import sys
from pathlib import Path

PATH = Path('/var/www/api.holidaibutler.com/CLAUDE.md')

ANCHOR = "## 🚨 Enterprise Kwaliteitsstandaarden (KRITIEK)"

REPLACEMENT = """## ⏱️ Stream Timeout Prevention (KRITIEK voor Claude Code sessies)

> **Bindende werkprotocol** voor lange sessies — voorkomt stream timeouts en sessie-corruptie.

1. **Doe elke genummerde taak ÉÉN TEGELIJK.** Complete → bevestig → ga verder.
2. **Schrijf NOOIT een bestand langer dan ~150 regels in één tool-call.** Splits langere bestanden in meerdere append/edit passes.
3. **Start een nieuwe sessie** wanneer de conversatie lang wordt (20+ tool-calls).
4. **Houd grep/search output kort.** Gebruik `--include` en `-l` flags. Verwerk niet meer dan 30-50 regels per call.
5. **Als timeout vuurt: retry dezelfde stap in kortere vorm.** Herstart NIET de complete taak.

**Toepassing**: deze regels gelden voor ELKE Claude Code sessie op dit project, ongeacht agent type. Bij overtreding: stop en herorganiseer in kleinere stappen.

---

## 🚨 Enterprise Kwaliteitsstandaarden (KRITIEK)"""


def main():
    if not PATH.exists():
        print(f"ERROR: {PATH} not found"); return 2
    content = PATH.read_text(encoding='utf-8')
    if "Stream Timeout Prevention" in content:
        print("Already patched."); return 0
    if ANCHOR not in content:
        print(f"FAIL: anchor not found"); return 3
    new_content = content.replace(ANCHOR, REPLACEMENT, 1)
    PATH.write_text(new_content, encoding='utf-8')
    print("Stream Timeout Prevention block added to CLAUDE.md")
    return 0


if __name__ == '__main__':
    sys.exit(main())
