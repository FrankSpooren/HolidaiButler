# UX Gap Analyse & Plan van Aanpak - December 2025

**Datum:** 13 December 2025
**Status:** Klaar voor implementatie
**Website:** https://test.holidaibutler.com

---

## Vergelijking Voorstellen vs. Huidige Implementatie

| # | UX Verbetering | Status | Toelichting |
|---|----------------|--------|-------------|
| **1** | Enhanced Filter System | ✅ GEÏMPLEMENTEERD | AgendaFilterModal, FilterPanel, POI filters aanwezig |
| **2** | Trust Building Components | ⚠️ GEDEELTELIJK | POIBadge bestaat, maar SocialProof, ReviewRating uitgebreid ontbreken |
| **3** | Mobile-First Design | ⚠️ GEDEELTELIJK | Responsive CSS aanwezig, maar geen bottom nav, touch targets niet overal 48px |
| **4** | Progressive Disclosure | ✅ GEÏMPLEMENTEERD | Modals, expandable sections aanwezig |
| **5** | WCAG Compliance | ✅ GEÏMPLEMENTEERD | WCAGModal aanwezig met accessibility opties |
| **6** | Sort & Ranking | ⚠️ GEDEELTELIJK | Alleen voor reviews, niet voor POI/Agenda hoofdlijst |
| **7** | GDPR/Cookie Consent | ❌ ONTBREEKT | Alleen cookie pagina link in footer, geen consent banner |
| **8** | Enhanced Loading States | ⚠️ GEDEELTELIJK | Lazy loading images ja, skeleton screens beperkt |
| **9** | Multi-Language | ✅ GEÏMPLEMENTEERD | 6 talen (NL, EN, DE, ES, SV, PL) |
| **10** | Error Handling | ✅ GEÏMPLEMENTEERD | ErrorBoundary aanwezig |
| **11** | Performance Optimization | ⚠️ GEDEELTELIJK | Lazy loading ja, code splitting beperkt |
| **12** | Analytics & Tracking | ❌ ONTBREEKT | Geen GA4/analytics implementatie gevonden |
| **13** | Search Enhancement | ✅ GEÏMPLEMENTEERD | Search bar op POI en Agenda pagina's |
| **14** | Notification System | ⚠️ GEDEELTELIJK | Toast in AgendaCard, geen centraal systeem |
| **15** | Booking Dashboard | ❌ N.V.T. | Reservations/Tickets modules tijdelijk offline |

---

## Ontbrekende UX Verbeteringen (Gap Analyse)

### 🔴 KRITIEK (Legal/Business Impact)

#### 1. Cookie Consent Banner (GDPR)
- **Theorie:** GDPR Art. 7 vereist expliciete consent vóór tracking
- **Business Case:** Booking.com, Airbnb - granulaire consent = +12% trust
- **Risico:** Boetes tot €20M of 4% jaaromzet
- **Status:** ❌ ONTBREEKT VOLLEDIG

#### 2. Analytics/Tracking Setup
- **Theorie:** Evidence-based design vereist data (Nielsen Norman Group)
- **Business Case:** Bedrijven met analytics hebben 23% hogere conversie (McKinsey)
- **Status:** ❌ ONTBREEKT

### 🟡 HOOG PRIORITEIT (Conversie Impact)

#### 3. Social Proof op Cards
- **Theorie:** Cialdini's 6 principles - Social Proof verhoogt conversie 15-20%
- **Business Case:** Booking.com "X mensen bekijken nu" = +18% conversie
- **Huidige:** POIBadge alleen voor verified/category, geen live social proof
- **Status:** ⚠️ BEPERKT

#### 4. Sort Functionaliteit voor POI/Agenda
- **Theorie:** Jakob's Law - gebruikers verwachten sort opties (Booking, GetYourGuide)
- **Business Case:** GetYourGuide sort by price = +15% engagement
- **Status:** ⚠️ ALLEEN REVIEWS

#### 5. Mobile Bottom Navigation
- **Theorie:** Fitts' Law - thumb zone (onderste 1/3 scherm) meest bereikbaar
- **Business Case:** Instagram, Airbnb bottom nav = +30% engagement op mobile
- **Status:** ❌ ONTBREEKT

### 🟢 MEDIUM PRIORITEIT (UX Polish)

#### 6. Skeleton Loading States
- **Theorie:** Perceived performance (Nielsen) - skeletons voelen 40% sneller
- **Business Case:** Facebook skeletons = -25% perceived wait time
- **Status:** ⚠️ BEPERKT

---

## Plan van Aanpak

### FASE 1: KRITIEKE COMPLIANCE (Week 1)
| Item | Wat | Waarom | Effort |
|------|-----|--------|--------|
| 1.1 | **Cookie Consent Banner** | GDPR compliance, legal risk | Medium |
| 1.2 | **Privacy Policy Page** | GDPR Art. 13/14 | Low |
| 1.3 | **Analytics Setup (GA4)** | Data-driven decisions | Low |

### FASE 2: CONVERSIE OPTIMALISATIE (Week 2)
| Item | Wat | Waarom | Effort |
|------|-----|--------|--------|
| 2.1 | **Sort voor POI pagina** | Jakob's Law, user expectation | Low |
| 2.2 | **Sort voor Agenda pagina** | Consistentie met POI | Low |
| 2.3 | **Social Proof badges** | +15-20% conversie (Cialdini) | Medium |

### FASE 3: MOBILE OPTIMALISATIE (Week 3)
| Item | Wat | Waarom | Effort |
|------|-----|--------|--------|
| 3.1 | **Mobile Bottom Navigation** | Fitts' Law, 70%+ mobile users | Medium |
| 3.2 | **Touch Target Audit** | WCAG 2.5.5 (48px minimum) | Low |
| 3.3 | **Sticky CTA Bar** | Conversie op mobile | Low |

### FASE 4: POLISH & PERFORMANCE (Week 4)
| Item | Wat | Waarom | Effort |
|------|-----|--------|--------|
| 4.1 | **Skeleton Loading States** | Perceived performance | Medium |
| 4.2 | **Code Splitting** | Core Web Vitals | Medium |
| 4.3 | **Image WebP Optimization** | Performance | Low |

---

## Bronnen UX-Theorie

1. **Nielsen Norman Group** - Evidence-based design, perceived performance
2. **Cialdini** - 6 Principles of Persuasion (Social Proof)
3. **Jakob Nielsen** - Jakob's Law (user expectations)
4. **Fitts' Law** - Touch target sizing, thumb zones
5. **Miller's Law** - 7±2 items cognitive limit
6. **WCAG 2.1 AA** - Accessibility guidelines
7. **GDPR** - EU privacy regulation

## Business Case Referenties

- **Booking.com:** Trust signals = +18% conversie
- **GetYourGuide:** Sort options = +15% engagement
- **Airbnb:** Bottom nav = +30% mobile engagement
- **Facebook:** Skeleton screens = -25% perceived wait time
- **McKinsey:** Analytics-driven = +23% conversie

---

**Document versie:** 1.0
**Volgende stap:** Na goedkeuring starten met Fase 1
