#!/usr/bin/env python3
"""Add hallucinationDetected + provenanceLabel keys to nl/en/de/es locales."""
import json
import sys
from pathlib import Path
from collections import OrderedDict

I18N_DIR = Path('/var/www/api.holidaibutler.com/admin-module/src/i18n')

NEW_KEYS = {
    'nl': {
        'hallucinationDetected': 'Mogelijke hallucinatie gedetecteerd: {{rate}}% van entiteiten niet gevonden in Merk Profiel',
        'provenanceLabel': 'EU AI Act provenance: {{sig}}…',
    },
    'en': {
        'hallucinationDetected': 'Possible hallucination detected: {{rate}}% of entities not found in Brand Profile',
        'provenanceLabel': 'EU AI Act provenance: {{sig}}…',
    },
    'de': {
        'hallucinationDetected': 'Mögliche Halluzination erkannt: {{rate}}% der Entitäten nicht im Markenprofil gefunden',
        'provenanceLabel': 'EU AI Act Provenienz: {{sig}}…',
    },
    'es': {
        'hallucinationDetected': 'Posible alucinación detectada: {{rate}}% de entidades no encontradas en Perfil de Marca',
        'provenanceLabel': 'Procedencia EU AI Act: {{sig}}…',
    },
}


def main():
    for locale, keys in NEW_KEYS.items():
        path = I18N_DIR / f'{locale}.json'
        if not path.exists():
            print(f'{locale}: NOT FOUND'); continue
        data = json.load(open(path, 'r', encoding='utf-8'), object_pairs_hook=OrderedDict)
        cs = data.get('contentStudio')
        if not cs:
            print(f'{locale}: no contentStudio'); continue
        rr = cs.get('rewriteResult', OrderedDict())
        all_present = all(k in rr for k in keys)
        if all_present:
            print(f'{locale}: already patched'); continue
        for k, v in keys.items():
            rr[k] = v
        cs['rewriteResult'] = rr
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write('\n')
        print(f'{locale}: patched ({len(keys)} keys)')


if __name__ == '__main__':
    main()
