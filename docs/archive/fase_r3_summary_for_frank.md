# Fase R3: Prompt Redesign — Samenvatting

**Datum**: 13 februari 2026
**Status**: COMPLEET
**Deliverables**: 5 bestanden op Hetzner

---

## Wat is er gedaan?

De content-generatie prompt is fundamenteel herschreven om hallucinaties te elimineren.
De oude prompt (Fase 4) vroeg het LLM om "concrete details" en "verrassende elementen" te verzinnen
ZONDER brondata — dit leidde tot 61% hallucinatie.

De nieuwe prompt (Fase R3):
1. **Injecteert echte brondata** (website-tekst uit R2) direct in de prompt
2. **16 anti-hallucinatie regels** die specifiek de R1-fouten adresseren
3. **4 kwaliteitsniveaus** met aangepaste strategie per brondata-dekking
4. **Categorie-specifieke regels** (Eten & Drinken, Natuur, Cultuur, etc.)
5. **Verificatie-prompt** voor automatische fact-check (second-pass)
6. **Vertaal-bewuste verificatie** (NL/ES brondata naar EN output)

## Resultaten (12 test-POIs)

| Metriek | R1 (oude prompt) | R3 (nieuwe prompt) |
|---------|-------------------|-------------------|
| **Hallucinatie-rate** | 61% | **ca. 14%** |
| PASS (0% fouten) | 0/100 | **3/12** |
| REVIEW (kleiner dan 20% fouten) | 0/100 | **7/12** |
| FAIL (groter dan 20% fouten) | 100/100 | **1/12** |

### Wat is opgelost:
- Geen verzonnen prijzen meer
- Geen verzonnen afstanden meer
- Geen verzonnen menu-items meer (bij minimal/none POIs)
- Geen verzonnen openingstijden meer
- Geen verzonnen faciliteiten meer

### Resterende "fouten" (14%):
- Grotendeels vertaal-parafrases (NL brondata naar EN beschrijving)
- Niet echte hallucinaties, maar strikte verifier telt ze mee
- In R4 worden deze automatisch gefilterd via de verificatie-pass

## Prompt Strategieen per Kwaliteitsniveau

| Kwaliteit | POIs | Woorddoel | Strategie |
|-----------|------|-----------|-----------|
| **Rich** | 1.462 (47%) | 110-140 | Volledige AIDA, gedetailleerd op basis van brondata |
| **Moderate** | 231 (8%) | 85-115 | Beperkte AIDA, gefocust op beschikbare feiten |
| **Minimal** | 1.066 (35%) | 55-85 | Kort en veilig, alleen harde feiten |
| **None** | 320 (10%) | 30-60 | Generiek template, naam+categorie+locatie |

## Deliverables op Hetzner (/root/)

| Bestand | Beschrijving |
|---------|-------------|
| fase_r3_prompt_templates.py | Productie-klare prompt module voor R4 |
| fase_r3_test_prompts.py | Test script met 12 POI verificatie |
| fase_r3_test_results.json | Volledige testresultaten (JSON) |
| fase_r3_test_report.md | Gedetailleerd testrapport |
| fase_r3_summary_for_frank.md | Dit bestand |

## Volgende stap: Fase R4

Fase R4 (Regeneratie + Verificatie Loop) kan nu starten:
1. Alle 3.079 POIs regenereren met nieuwe prompts + R2 brondata
2. Automatische fact-check per POI (verificatie-prompt)
3. Triage: POIs met meer dan 20% unsupported claims naar review queue voor Frank
4. Geschatte doorlooptijd: 4-6 uur (generatie + verificatie)
5. Geschatte API-kosten: ca. 15-25 EUR (Mistral Large)
