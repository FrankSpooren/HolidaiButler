# Warredal Candidate Matcher - Gebruikershandleiding

## 📖 Inhoudsopgave

1. [Inleiding](#inleiding)
2. [Aan de slag](#aan-de-slag)
3. [Vacatures beheren](#vacatures-beheren)
4. [Kandidaten zoeken en toevoegen](#kandidaten-zoeken-en-toevoegen)
5. [Matching systeem](#matching-systeem)
6. [Berichten genereren en versturen](#berichten-genereren-en-versturen)
7. [Dashboard en rapportages](#dashboard-en-rapportages)
8. [Tips en best practices](#tips-en-best-practices)

## 🎯 Inleiding

De Warredal Candidate Matcher is een intelligente recruitment tool die HR-professionals helpt om:
- Geschikte kandidaten te vinden via LinkedIn
- Kandidaten automatisch te scoren op basis van flexibele criteria
- Gepersonaliseerde berichten te genereren met AI
- Het volledige recruitment proces te monitoren

## 🚀 Aan de slag

### Eerste login

1. Navigeer naar `http://your-domain.com:3000`
2. Log in met je credentials
3. Je komt terecht op het dashboard

### Interface overzicht

De applicatie heeft een **mobile-first design** en is volledig responsive:
- **Sidebar** (desktop) / **Hamburger menu** (mobiel): Navigatie tussen modules
- **Dashboard**: Overzicht van statistieken
- **Vacatures**: Beheer van openstaande vacatures
- **Kandidaten**: Overzicht en detail van kandidaten
- **Berichten**: Berichtenbeheer en verzending
- **Instellingen**: Profiel en configuratie

## 💼 Vacatures beheren

### Nieuwe vacature aanmaken

1. Ga naar **Vacatures** > **Nieuwe Vacature**
2. Vul de basisgegevens in:
   - Titel (bijv. "Marketing & Sales Manager")
   - Organisatie (bijv. "Warredal")
   - Locatie (bijv. "Maaseik, België")
   - Beschrijving
   - Requirements
   - Website URL

### Criteria instellen

Criteria bepalen hoe kandidaten worden gescoord. Elke vacature kan unieke criteria hebben:

#### Criterium toevoegen

1. Open een vacature
2. Ga naar tabblad **Criteria**
3. Klik **Nieuw Criterium**
4. Vul in:
   - **Naam**: Bijvoorbeeld "Opleiding Marketing"
   - **Categorie**: education, experience, skills, network, personality, location
   - **Weging**: 0-10 (hoger = belangrijker)
   - **Type**: boolean (ja/nee), scale (0-10), text
   - **Keywords**: Voor automatische matching
   - **Vereist**: Must-have criterium

#### Voorbeeld criteria voor Marketing & Sales (Warredal)

| Criterium | Categorie | Weging | Keywords |
|-----------|-----------|--------|----------|
| Diploma Marketing/Communicatie | education | 8 | marketing, communicatie, commercie, toerisme |
| Belgische/Nederlandse nationaliteit | location | 7 | belgië, belgi, vlaanderen, nederland |
| 5+ jaar ervaring toerisme | experience | 9 | toerisme, tourism, recreatie |
| B2B netwerk Vlaanderen | network | 8 | b2b, business, vlaanderen |
| Leidinggevende ervaring | experience | 6 | manager, lead, director, team lead |
| Teamplayer | personality | 5 | team, samenwerking, collaboration |

### Vacature activeren

1. Controleer alle criteria
2. Wijzig status naar **Active**
3. De vacature is nu klaar voor kandidaten matching

## 👥 Kandidaten zoeken en toevoegen

### Methode 1: LinkedIn Scraping (Handmatig)

1. Ga naar **Kandidaten** > **Toevoegen**
2. Kies **LinkedIn Profile Scrapen**
3. Plak LinkedIn URL (bijv. `https://linkedin.com/in/username`)
4. Selecteer vacature
5. Klik **Scrapen en Scoren**

De tool haalt automatisch op:
- Naam en contactgegevens (indien publiek)
- Huidige functie en bedrijf
- Werkervaring
- Opleidingen
- Vaardigheden
- Talen

### Methode 2: LinkedIn Search (Batch)

1. Ga naar **Kandidaten** > **Zoeken**
2. Voer zoekterm in: `"Marketing Manager" Belgium tourism`
3. Stel filters in:
   - Locatie
   - Industrie
   - Ervaring level
4. Kies vacature
5. Klik **Zoeken en Scrapen**

De tool zoekt LinkedIn en scraped automatisch meerdere profielen.

**⚠️ Let op:**
- LinkedIn heeft rate limits - gebruik met mate
- Wacht tussen batch operations
- Publieke profielen geven beperkte data
- Voor uitgebreidere data: gebruik LinkedIn Recruiter API (toekomstige feature)

### Methode 3: Handmatig Toevoegen

Voor kandidaten uit andere bronnen:

1. Ga naar **Kandidaten** > **Toevoegen**
2. Kies **Handmatig Invoeren**
3. Vul alle relevante velden in
4. Klik **Opslaan en Scoren**

### Kandidaat importeren (CSV)

1. Bereid CSV voor met kolommen: firstName, lastName, email, phone, location, etc.
2. Ga naar **Kandidaten** > **Importeren**
3. Upload CSV
4. Map kolommen
5. Selecteer vacature
6. Klik **Importeren en Scoren**

## 🎯 Matching systeem

### Hoe werkt de scoring?

Het systeem gebruikt een **gewogen scoring algoritme**:

1. **Per criterium**: Kandidaat krijgt score 0-10
2. **Gewogen score**: Score × Weging criterium
3. **Totaalscore**: Som van alle gewogen scores
4. **Match %**: (Totaalscore / Max mogelijke score) × 100

#### Voorbeeld berekening

Criterium | Score | Weging | Gewogen Score
----------|-------|--------|---------------
Diploma Marketing | 10 | 8 | 80
Nationaliteit BE/NL | 10 | 7 | 70
5+ jaar ervaring | 8 | 9 | 72
B2B netwerk | 6 | 8 | 48
Leidinggevende ervaring | 7 | 6 | 42
**TOTAAL** | - | **38** | **312**

**Match percentage**: (312 / 380) × 100 = **82.1%**

### Automatische vs. Handmatige scoring

#### Automatisch gescoord (met confidence)

- **Education**: Op basis van keywords in diploma/opleiding
- **Experience**: Op basis van jaren + keywords
- **Skills**: Keyword matching
- **Location**: Exacte match locatie
- **Network**: Geschat op basis van locatie/ervaring

#### Handmatig scoren (vereist)

- **Personality**: Persoonlijke eigenschappen (teamplayer, communicatief, etc.)
- **Network**: Exacte grootte B2B netwerk
- **Leadership**: Leiderschapskwaliteiten

### Score aanpassen

1. Open kandidaat detail pagina
2. Ga naar **Scores** tabblad
3. Klik op score om te bewerken
4. Voeg notities toe
5. Klik **Opslaan**

De **Match %** wordt automatisch herberekend.

### Kandidaten filteren en sorteren

Op de kandidaten lijst pagina:

- **Filter op status**: sourced, qualified, contacted, etc.
- **Filter op min. match %**: Bijvoorbeeld >70%
- **Filter op vacature**
- **Sorteer op**: Match %, Naam, Datum toegevoegd

## 📧 Berichten genereren en versturen

### Bericht genereren (AI)

1. Selecteer kandidaat(en)
2. Klik **Bericht Genereren**
3. Kies template (optioneel)
4. Klik **Genereren**

De **MailerLite AI** genereert automatisch een gepersonaliseerd bericht op basis van:
- Kandidaat profiel (naam, functie, ervaring)
- Vacature details
- Match score en sterke punten
- Template (indien geselecteerd)

#### Voorbeeld gegenereerd bericht

```
Onderwerp: Kans als Marketing & Sales bij Warredal in Maaseik

Beste Sarah,

Ik kwam je profiel tegen en ben onder de indruk van je ervaring als
Marketing Manager bij TravelCo België.

Bij Warredal in Maaseik zijn we op zoek naar een gedreven Marketing &
Sales professional. Gezien jouw achtergrond in toerisme, marketing en
je 7+ jaar ervaring, denk ik dat deze rol perfect bij je zou passen.

Wat maakt deze kans bijzonder:
- Strategische rol in een groeiende organisatie
- Directe impact op de ontwikkeling van Warredal
- Uitdagend en gevarieerd takenpakket
- Professioneel team en moderne werkomgeving

Zou je open staan voor een vrijblijvend gesprek om de mogelijkheden
te verkennen?

Met vriendelijke groet,
[Jouw naam]
```

### Bericht bewerken

1. Open gegenereerd bericht
2. Klik **Bewerken**
3. Pas tekst aan
4. Klik **Opslaan**

### Bericht versturen

#### Via MailerLite (geautomatiseerd)

1. Open bericht
2. Controleer inhoud
3. Klik **Versturen via MailerLite**

Het systeem:
- Voegt kandidaat toe aan MailerLite
- Verstuurt email via MailerLite campaign
- Tracked delivery en opens
- Monitored responses

#### Handmatig versturen

1. Open bericht
2. Klik **Kopiëren naar clipboard**
3. Plak in LinkedIn InMail of email client
4. Verstuur handmatig
5. Mark bericht als **Verzonden** in systeem

### Batch messaging

Voor meerdere kandidaten tegelijk:

1. Ga naar **Kandidaten**
2. Selecteer meerdere kandidaten (checkbox)
3. Klik **Berichten Genereren (Batch)**
4. Controleer alle berichten
5. Klik **Allemaal Versturen**

## 📊 Dashboard en rapportages

### Dashboard widgets

- **Actieve vacatures**: Aantal openstaande vacatures
- **Totaal kandidaten**: Alle kandidaten in systeem
- **Gemiddelde match**: Average match percentage
- **Berichten verzonden**: Aantal uitgestuurde berichten
- **Response rate**: % kandidaten die reageren

### Vacature statistieken

Per vacature zie je:
- Aantal kandidaten per status
- Gemiddelde match percentage
- Top 5 kandidaten
- Funnel visualisatie

### Kandidaat pipeline

Kandidaten doorlopen deze statussen:

1. **Sourced**: Gevonden en toegevoegd
2. **Qualified**: Voldoet aan minimum criteria
3. **Message Drafted**: Bericht opgesteld
4. **Contacted**: Benaderd
5. **Responded**: Heeft gereageerd
6. **Interview**: Interview gepland
7. **Offer**: Aanbieding gedaan
8. **Hired**: Aangenomen

Of:
- **Rejected**: Afgewezen door organisatie
- **Not Interested**: Kandidaat niet geïnteresseerd

### Exporteren

#### Kandidaten exporteren naar Excel

1. Open vacature
2. Klik **Exporteren** > **Excel**

Excel bevat:
- Alle kandidaat gegevens
- Match percentages
- Individuele criterion scores
- Status en contactgegevens
- LinkedIn URLs

Perfect voor presentaties aan hiring managers!

## 💡 Tips en best practices

### LinkedIn Scraping

✅ **DO:**
- Gebruik LinkedIn via je persoonlijke account
- Respecteer rate limits (max 10-20 profiles per uur)
- Focus op kandidaten met publieke profielen
- Scrape alleen relevante kandidaten

❌ **DON'T:**
- Scrape honderden profielen tegelijk
- Gebruik bots 24/7
- Negeer LinkedIn Terms of Service

### Criteria instellen

- **Start simpel**: Begin met 5-7 key criteria
- **Test en verfijn**: Kijk naar resultaten en pas aan
- **Weging is key**: Belangrijkste criteria krijgen hogere weging
- **Balance automatisch/handmatig**: Mix van beide geeft beste resultaten

### Berichten personaliseren

- **Wees specifiek**: Noem concrete skills/ervaring van kandidaat
- **Wees authentiek**: Pas AI tekst aan naar jouw tone-of-voice
- **Call-to-action**: Maak duidelijk wat de volgende stap is
- **Follow-up**: Stuur reminder na 1 week geen response

### Workflow optimalisatie

1. **Maandag**: Zoek en scrape nieuwe kandidaten
2. **Dinsdag**: Review en score kandidaten
3. **Woensdag**: Genereer en verstuur berichten
4. **Donderdag-Vrijdag**: Follow-up en interviews plannen

### Privacy & GDPR

- ✅ Gebruik alleen publieke data
- ✅ Bied kandidaten opt-out mogelijkheid
- ✅ Verwijder data op verzoek
- ✅ Beveilig data met sterke wachtwoorden

## 📞 Support

Vragen of problemen?

- **Documentatie**: Zie README.md en DEPLOYMENT.md
- **Email**: recruitment@warredal.be
- **LinkedIn**: https://www.linkedin.com/company/warredal

## 🔄 Updates

Het systeem wordt regelmatig geüpdatet met nieuwe features:

**Roadmap:**
- ✅ LinkedIn scraping (handmatig)
- ✅ Intelligent matching systeem
- ✅ MailerLite integratie
- ⏳ LinkedIn Recruiter API integratie
- ⏳ Automatische response monitoring
- ⏳ Interview scheduling
- ⏳ Advanced analytics & reporting
- ⏳ Multi-user collaboration

**Blijf op de hoogte** via de releases page.

---

**Succes met recruitment! 🎯**
