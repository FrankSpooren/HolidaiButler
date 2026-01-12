---
version: 1.0.0
last_updated: 2026-01-12
author: Claude AI
status: active
---

# Brand Guidelines Skill

> Merkidentiteit en visuele richtlijnen voor HolidaiButler

---

## 🎯 Brand Mission

HolidaiButler is een **premium AI-powered tourism platform** dat internationale toeristen persoonlijke lokale aanbevelingen geeft voor authentieke ervaringen.

### Brand Personality
- **Premium**: Kwaliteit boven kwantiteit
- **Warm**: Persoonlijk en gastvrij
- **Mediterranean**: Relaxed maar professioneel
- **Trustworthy**: Betrouwbaar en transparant
- **Smart**: AI-powered maar menselijk

### Tone of Voice
- Vriendelijk maar professioneel
- Informatief zonder overweldigend
- Lokaal expert, geen toerist
- Behulpzaam, niet opdringerig

---

## 🎨 Kleuren

### Primaire Kleuren

| Naam | Hex | RGB | Gebruik |
|------|-----|-----|---------|
| Header Gradient Start | #7FA594 | 127, 165, 148 | Header achtergrond |
| Header Gradient Mid | #5E8B7E | 94, 139, 126 | Gradient midden |
| Header Gradient End | #4A7066 | 74, 112, 102 | Gradient einde |
| Gouden Accent | #D4AF37 | 212, 175, 55 | CTAs, highlights, premium |

### Secundaire Kleuren

| Naam | Hex | RGB | Gebruik |
|------|-----|-----|---------|
| Button Primary | #8BA99D | 139, 169, 157 | Primaire knoppen |
| Text Primary | #2C3E50 | 44, 62, 80 | Hoofdtekst |
| Text Secondary | #687684 | 104, 118, 132 | Subtekst, labels |
| Background Light | #F8F9FA | 248, 249, 250 | Pagina achtergrond |
| Background Card | #FFFFFF | 255, 255, 255 | Kaarten, modals |

### Feedback Kleuren

| Naam | Hex | Gebruik |
|------|-----|---------|
| Success | #28A745 | Bevestigingen |
| Warning | #FFC107 | Waarschuwingen |
| Error | #DC3545 | Fouten |
| Info | #17A2B8 | Informatief |

---

## 🔤 Typography

### Font Familie
**Inter** - Modern, leesbaar, professioneel

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Font Sizes

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 | 32px / 2rem | 700 (Bold) | 1.2 |
| H2 | 24px / 1.5rem | 600 (Semi-bold) | 1.3 |
| H3 | 20px / 1.25rem | 600 (Semi-bold) | 1.4 |
| H4 | 18px / 1.125rem | 500 (Medium) | 1.4 |
| Body | 16px / 1rem | 400 (Regular) | 1.6 |
| Small | 14px / 0.875rem | 400 (Regular) | 1.5 |
| Caption | 12px / 0.75rem | 400 (Regular) | 1.4 |

### Font Usage Rules
- **Headlines**: Bold, Primary color (#2C3E50)
- **Body text**: Regular, Primary color
- **Links**: Medium, Gouden Accent (#D4AF37) on hover
- **Labels**: Regular, Secondary color (#687684)

---

## 📐 Spacing & Layout

### Spacing Scale (8px base)

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Inline spacing |
| sm | 8px | Tight spacing |
| md | 16px | Default spacing |
| lg | 24px | Section spacing |
| xl | 32px | Large gaps |
| 2xl | 48px | Section dividers |
| 3xl | 64px | Page sections |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| sm | 4px | Buttons, inputs |
| md | 8px | Cards, modals |
| lg | 12px | Large cards |
| full | 9999px | Pills, avatars |

### Shadows

```css
/* Card shadow */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

/* Elevated shadow (hover) */
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);

/* Modal shadow */
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
```

---

## 🖼️ Logo Usage

### Logo Variants
1. **Full logo**: Voor headers, grote ruimtes
2. **Icon only**: Voor favicons, kleine ruimtes
3. **White version**: Op donkere achtergronden

### Clear Space
Minimaal 16px vrije ruimte rondom het logo

### Minimum Size
- Full logo: minimaal 120px breed
- Icon only: minimaal 32px

### Don'ts
- ❌ Logo niet vervormen
- ❌ Kleuren niet aanpassen
- ❌ Geen effecten toevoegen (shadow, glow)
- ❌ Niet op drukke achtergronden plaatsen

---

## 🖱️ UI Components

### Buttons

**Primary Button**
```css
background: #8BA99D;
color: white;
padding: 12px 24px;
border-radius: 4px;
font-weight: 500;
```

**Secondary Button**
```css
background: transparent;
border: 1px solid #8BA99D;
color: #8BA99D;
padding: 12px 24px;
border-radius: 4px;
```

**CTA Button (Golden)**
```css
background: #D4AF37;
color: white;
padding: 12px 24px;
border-radius: 4px;
font-weight: 600;
```

### Cards

```css
background: white;
border-radius: 8px;
padding: 16px;
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
```

### Input Fields

```css
border: 1px solid #E0E0E0;
border-radius: 4px;
padding: 12px 16px;
font-size: 16px;
/* Focus state */
border-color: #7FA594;
box-shadow: 0 0 0 3px rgba(127, 165, 148, 0.2);
```

---

## 📱 Responsive Breakpoints

| Breakpoint | Width | Device |
|------------|-------|--------|
| sm | 640px | Mobile landscape |
| md | 768px | Tablet |
| lg | 1024px | Desktop |
| xl | 1280px | Large desktop |
| 2xl | 1536px | Extra large |

### Mobile-First Approach
- Design voor mobile eerst
- Voeg complexiteit toe voor grotere schermen
- Touch targets minimaal 44x44px

---

## 🌍 Multi-Language Guidelines

### Supported Languages
1. **Nederlands (NL)** - Primary
2. **Duits (DE)** - Secondary
3. **Engels (EN)** - Tertiary

### Translation Rules
- Behoud tone of voice in alle talen
- Pas lokale uitdrukkingen aan
- Datums en valuta lokaliseren
- Rechtse talen (RTL) momenteel niet ondersteund

### Content Length
- Duitse tekst is vaak 20-30% langer
- Reserveer ruimte in UI
- Test met langste vertalingen

---

## 📸 Imagery

### Photography Style
- Authentiek, niet geposeerd
- Lokale sfeer en cultuur
- Warme, Mediterranean tinten
- Mensen in natuurlijke setting

### Image Guidelines
- Minimaal 1200px breed voor heroes
- WebP format voor web
- Alt tekst altijd invullen
- Lazy loading voor performance

### POI Images
- Prioriteit: eigen foto's > Google Places
- Fallback: category gradient + icon
- Aspect ratio: 16:9 of 4:3

---

## ✅ Brand Checklist

Bij elke UI wijziging:

- [ ] Kleuren conform palette?
- [ ] Inter font gebruikt?
- [ ] Spacing conform 8px grid?
- [ ] Touch targets minimaal 44px?
- [ ] Contrast WCAG AA compliant?
- [ ] Logo correct geplaatst?
- [ ] Tone of voice consistent?
- [ ] Alle talen getest?

---

*Deze skill wordt beheerd door de Content & Branding Agent.*
