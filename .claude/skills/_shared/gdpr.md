---
version: 1.0.0
last_updated: 2026-01-12
author: Claude AI
status: active
---

# GDPR Compliance Skill

> Richtlijnen voor GDPR-compliant werken binnen HolidaiButler

---

## 🎯 Doel

Deze skill beschrijft hoe alle agents GDPR-compliant moeten werken bij het verwerken van persoonsgegevens.

---

## 📋 Relevante GDPR Artikelen

| Artikel | Onderwerp | Toepassing HolidaiButler |
|---------|-----------|--------------------------|
| Art. 6 | Rechtmatige grondslag | Toestemming of uitvoering overeenkomst |
| Art. 13 | Informatieplicht | Privacy policy op website |
| Art. 15 | Recht op inzage | Data export functie |
| Art. 16 | Recht op rectificatie | Account wijzigingen |
| Art. 17 | Recht op vergetelheid | Account verwijdering |
| Art. 20 | Recht op overdraagbaarheid | Data export (JSON/CSV) |
| Art. 32 | Beveiliging | Encryptie, access control |

---

## 👤 Persoonsgegevens in HolidaiButler

### User Data (holidaibutler.com)
- Email adres
- Naam (optioneel)
- Voorkeuren (talen, interesses)
- Zoekgeschiedenis
- Chat logs (HoliBot)

### Partner Data (admin.holidaibutler.com)
- Bedrijfsnaam
- Contactpersoon
- Email adres
- Telefoonnummer
- KvK nummer
- Bankgegevens (voor uitbetalingen)

---

## ⏱️ Verwerkingstermijnen

| Verzoek | Maximale termijn | Auto-approve? |
|---------|------------------|---------------|
| Data inzage | 24 uur | Ja |
| Data export | 24 uur | Ja |
| User verwijdering | 72 uur | Ja |
| Partner verwijdering | 72 uur | Nee (owner approval) |
| Data rectificatie | 24 uur | Ja |

---

## 🗑️ Verwijderingsprotocol

### User Account Verwijdering (AUTO-APPROVE)

```
1. Ontvang verwijderingsverzoek
2. Valideer identiteit (email verificatie)
3. Verwijder uit:
   - Users tabel (MySQL)
   - Chat logs (MongoDB)
   - Voorkeuren (MongoDB)
   - Email lijsten (MailerLite)
   - Vector embeddings gerelateerd aan user (ChromaDB)
4. Stuur bevestigingsmail
5. Log actie in audit trail
```

### Partner Account Verwijdering (OWNER APPROVAL VEREIST)

```
1. Ontvang verwijderingsverzoek
2. Valideer identiteit
3. Stuur approval request naar owner
4. Wacht op approval (max 72 uur)
5. Bij approval: verwijder uit alle systemen
6. Bij rejection: informeer partner met reden
7. Log actie in audit trail
```

---

## 📊 Audit Trail

Alle data-gerelateerde acties worden gelogd:

| Veld | Beschrijving |
|------|--------------|
| timestamp | Tijdstip van actie |
| action_type | CREATE, READ, UPDATE, DELETE |
| user_id | ID van betreffende user |
| actor | User zelf, Admin, of Agent |
| data_category | Account, Preferences, Chat, etc. |
| details | Specifieke wijzigingen |

**Retentie audit logs**: 30 dagen

---

## 🔐 Data Minimalisatie

### Principes
- Verzamel alleen wat nodig is
- Bewaar niet langer dan noodzakelijk
- Anonimiseer waar mogelijk

### Retentieperiodes

| Data Type | Retentie | Daarna |
|-----------|----------|--------|
| Actieve accounts | Onbeperkt | - |
| Inactieve accounts | 2 jaar | Verwijderen |
| Chat logs | 1 jaar | Anonimiseren |
| Zoekgeschiedenis | 6 maanden | Verwijderen |
| Transacties | 7 jaar | Wettelijke verplichting |
| Audit logs | 30 dagen | Verwijderen |

---

## 🚨 Data Breach Protocol

Bij een datalek:

1. **Binnen 1 uur**: Beoordeel ernst en omvang
2. **Binnen 24 uur**: Informeer owner
3. **Binnen 72 uur**: Meld bij Autoriteit Persoonsgegevens (indien vereist)
4. **Direct daarna**: Informeer getroffen gebruikers (indien vereist)

### Meldingsplicht

Melden bij AP als:
- Risico op rechten en vrijheden van betrokkenen
- Gevoelige gegevens gelekt
- Grote aantallen betrokkenen

---

## ✅ Checklist voor Agents

Bij elke data-operatie:

- [ ] Is er een rechtmatige grondslag?
- [ ] Wordt alleen noodzakelijke data verwerkt?
- [ ] Is de data beveiligd (encryptie, access control)?
- [ ] Wordt de actie gelogd in audit trail?
- [ ] Is de retentieperiode correct ingesteld?
- [ ] Heeft de user toestemming gegeven (indien vereist)?

---

## 📞 Contact

**Functionaris Gegevensbescherming**: Frank Spooren
**Email**: info@holidaibutler.com

---

*Deze skill wordt beheerd door de Data Rights (GDPR) Agent.*
