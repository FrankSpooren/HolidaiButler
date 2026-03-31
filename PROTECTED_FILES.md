# Protected Files — NIET WIJZIGEN

> **Datum**: 31 maart 2026
> **Reden**: CalpeTrip.com mobiele homepage live promotiecampagne vanaf 1 april 2026
> **Geldigheid**: Tot Frank expliciet toestemming geeft om te wijzigen

---

## CalpeTrip Mobiele Homepage — BESCHERMD

Deze bestanden vormen de live CalpeTrip.com mobiele homepage template.
**GEEN wijzigingen doorvoeren zonder expliciete goedkeuring van Frank.**

### Componenten (NIET AANRAKEN)

| Bestand | Functie |
|---------|---------|
| `hb-websites/src/components/mobile/MobileHomepage.tsx` | Wrapper: rendert alleen op `/`, `md:hidden` |
| `hb-websites/src/components/mobile/ProgramCard.tsx` | Dagprogramma (ochtend/middag/avond) |
| `hb-websites/src/components/mobile/TipOfTheDay.tsx` | Dagelijkse tip |
| `hb-websites/src/components/mobile/TodayEvents.tsx` | Vandaag's evenementen (horizontale scroll) |
| `hb-websites/src/components/mobile/MapPreview.tsx` | Interactieve kaart preview |
| `hb-websites/src/components/MobileHeader.tsx` | Mobiele header (gradient, brand, hamburger) |
| `hb-websites/src/components/MobileBottomNav.tsx` | Bottom navigatie (5 tabs) |
| `hb-websites/src/components/OnboardingSheet.tsx` | Onboarding bottom-sheet |

### Layout & Routing (VOORZICHTIG)

| Bestand | Beschermde secties |
|---------|-------------------|
| `hb-websites/src/app/layout.tsx` | `tenantSlug !== 'texel'` conditie voor MobileHomepage rendering |
| `hb-websites/src/app/[[...slug]]/page.tsx` | `tenantSlug !== 'texel'` homepage skip (voorkomt DB blocks op Calpe mobiel) |
| `hb-websites/src/lib/portal-url.ts` | `getPortalUrl()` en `getDestinationSlug()` — Calpe mappings |

### Apache Routing (NIET AANRAKEN)

| Bestand | Functie |
|---------|---------|
| `/etc/apache2/sites-enabled/calpetrip.com-le-ssl.conf` | Mobile User-Agent → Next.js, Desktop → Vite SPA |

---

## Wat WEL veilig gewijzigd kan worden

- `hb-websites/src/blocks/Desktop*.tsx` — desktop homepage blocks (alleen Texel)
- `hb-websites/src/blocks/CategoryGrid.tsx` — desktop categorie grid
- `hb-websites/src/blocks/Map.tsx` — Map block (mits legenda/overlay only, geen marker logica)
- `hb-websites/src/blocks/PoiGrid.tsx` — POI grid (mits `title` prop only)
- Alle bestanden in `admin-module/` — Admin Portal
- DB wijzigingen aan `pages` tabel voor `destination_id=2` (Texel)
- DB wijzigingen aan `destinations` tabel voor `id=2` (Texel branding/config)

---

## Verplichte post-deploy regressietest

Na ELKE deploy van hb-websites, voer deze checks uit:

```bash
# 1. CalpeTrip mobiel: MobileHomepage actief, geen Hero blocks
curl -s -H "User-Agent: iPhone" https://calpetrip.com/ | python3 -c "
import sys; html=sys.stdin.read()
assert 'flex flex-col gap-5' in html, 'FAIL: MobileHomepage wrapper missing'
assert 'Welkom in Calpe' not in html, 'FAIL: Hero block leaking into mobile'
print('PASS: CalpeTrip mobiel OK')
"

# 2. CalpeTrip desktop: Vite SPA
curl -s https://calpetrip.com/ | head -3 | grep -q "Multi-destination Customer Portal" && echo "PASS: Calpe desktop Vite SPA" || echo "FAIL: Calpe desktop not Vite"

# 3. Texel: Next.js page builder
curl -s -o /dev/null -w "%{http_code}" https://dev.texelmaps.nl/ | grep -q "200" && echo "PASS: Texel 200" || echo "FAIL: Texel down"

# 4. holidaibutler.com: B2B
curl -s https://holidaibutler.com/ | grep -q "AI-Powered Tourism Platform" && echo "PASS: B2B OK" || echo "FAIL: B2B broken"
```

**Alle 4 checks moeten PASS zijn. Bij FAIL: onmiddellijk rollback.**
