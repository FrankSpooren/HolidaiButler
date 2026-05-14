#!/usr/bin/env python3
"""
Add contentStudio.rewriteResult i18n keys to nl/en/de/es locales.

Keys:
- improved              : success message with score progression
- notImprovedScoreHigh  : score already ≥ threshold (i18n fix for Frank's screenshot)
- notImprovedAiUnable   : AI couldn't improve, manual editing needed
- notImprovedFallback   : generic fallback with raw reason (legacy compatibility)

Idempotent: if keys already exist, skips that locale.
"""
import json
import sys
from pathlib import Path
from collections import OrderedDict

I18N_DIR = Path('/var/www/api.holidaibutler.com/admin-module/src/i18n')

# Translations per locale
TRANSLATIONS = {
    'nl': {
        'improved': 'Content verbeterd! Score: {{original}} → {{final}}/100',
        'notImprovedScoreHigh': 'Niet verbeterd: Score reeds ≥{{threshold}}',
        'notImprovedAiUnable': 'Niet verbeterd: AI kon score niet verhogen — handmatige bewerking aanbevolen',
        'notImprovedFallback': 'Niet verbeterd: {{reason}}',
        'noInternalSources': 'Geen merk-bronnen beschikbaar. Voor kwaliteitsverbetering: voeg Merk Profiel documentatie en/of URL toe.',
    },
    'en': {
        'improved': 'Content improved! Score: {{original}} → {{final}}/100',
        'notImprovedScoreHigh': 'Not improved: Score already ≥{{threshold}}',
        'notImprovedAiUnable': 'Not improved: AI could not raise the score — manual editing recommended',
        'notImprovedFallback': 'Not improved: {{reason}}',
        'noInternalSources': 'No brand sources available. To improve quality: add Brand Profile documentation and/or URL.',
    },
    'de': {
        'improved': 'Inhalt verbessert! Punktzahl: {{original}} → {{final}}/100',
        'notImprovedScoreHigh': 'Nicht verbessert: Punktzahl bereits ≥{{threshold}}',
        'notImprovedAiUnable': 'Nicht verbessert: KI konnte die Punktzahl nicht erhöhen — manuelle Bearbeitung empfohlen',
        'notImprovedFallback': 'Nicht verbessert: {{reason}}',
        'noInternalSources': 'Keine Markenquellen verfügbar. Zur Qualitätsverbesserung: Markenprofil-Dokumentation und/oder URL hinzufügen.',
    },
    'es': {
        'improved': '¡Contenido mejorado! Puntuación: {{original}} → {{final}}/100',
        'notImprovedScoreHigh': 'No mejorado: Puntuación ya ≥{{threshold}}',
        'notImprovedAiUnable': 'No mejorado: La IA no pudo aumentar la puntuación — se recomienda edición manual',
        'notImprovedFallback': 'No mejorado: {{reason}}',
        'noInternalSources': 'No hay fuentes de marca disponibles. Para mejorar la calidad: añade documentación de Perfil de Marca y/o URL.',
    },
}


def patch_locale(locale, translations):
    path = I18N_DIR / f'{locale}.json'
    if not path.exists():
        return f'{locale}: NOT FOUND'

    # Preserve order using OrderedDict
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f, object_pairs_hook=OrderedDict)

    cs = data.get('contentStudio')
    if not isinstance(cs, (dict, OrderedDict)):
        return f'{locale}: contentStudio namespace missing'

    existing = cs.get('rewriteResult')
    if isinstance(existing, (dict, OrderedDict)) and all(k in existing for k in translations.keys()):
        return f'{locale}: already patched (skip)'

    rewrite_result = OrderedDict(existing) if isinstance(existing, (dict, OrderedDict)) else OrderedDict()
    for k, v in translations.items():
        rewrite_result[k] = v

    cs['rewriteResult'] = rewrite_result

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

    return f'{locale}: patched ({len(translations)} keys)'


def main():
    if not I18N_DIR.exists():
        print(f'ERROR: {I18N_DIR} not found')
        return 2

    for locale, translations in TRANSLATIONS.items():
        print(patch_locale(locale, translations))

    return 0


if __name__ == '__main__':
    sys.exit(main())
