# Deprecation Notices

> Skills die worden uitgefaseerd krijgen hier 30 dagen notice.

---

## Actieve Deprecations

*Geen actieve deprecations op dit moment.*

---

## Deprecation Process

### Stap 1: Aankondiging (Dag 0)
- Entry toevoegen aan dit bestand
- `status: deprecated` in skill YAML header
- Owner notificatie

### Stap 2: Waarschuwingsperiode (Dag 1-30)
- Skill blijft functioneel
- Agents geven waarschuwing bij gebruik
- Alternatief skill documenteren

### Stap 3: Verwijdering (Dag 30+)
- Skill verwijderd uit actieve folder
- Gearchiveerd in `_archive/` folder
- CHANGELOG bijgewerkt

---

## Template voor Deprecation Notice

```markdown
## [Skill Naam] - [versie]

| Eigenschap | Waarde |
|------------|--------|
| **Aangekondigd** | [datum] |
| **Verwijdering** | [datum + 30 dagen] |
| **Reden** | [waarom deprecated] |
| **Alternatief** | [vervangend skill of actie] |
| **Impact** | [welke agents/processen geraakt] |

### Migratie instructies
[Stappen om naar alternatief te migreren]
```

---

## Afgeronde Deprecations

*Nog geen afgeronde deprecations.*

---

## Voorbeeld Entry (Template)

### example-skill.md - v1.0.0

| Eigenschap | Waarde |
|------------|--------|
| **Aangekondigd** | 2026-01-12 |
| **Verwijdering** | 2026-02-12 |
| **Reden** | Vervangen door nieuwe versie met uitgebreidere functionaliteit |
| **Alternatief** | example-skill-v2.md |
| **Impact** | Data Sync Agent, Content Agent |

### Migratie instructies
1. Update agent configuratie om nieuwe skill te laden
2. Test nieuwe skill in dev omgeving
3. Verwijder referenties naar oude skill

---

*Dit bestand wordt beheerd door de Orchestrator Agent.*
