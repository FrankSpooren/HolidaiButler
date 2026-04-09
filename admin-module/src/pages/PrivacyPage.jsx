import { Box, Typography, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const S = ({ children }) => (
  <Typography sx={{ fontSize: '0.92rem', color: '#C8D0DA', lineHeight: 1.7, mb: 2 }}>{children}</Typography>
);
const H2 = ({ children }) => (
  <Typography sx={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', mt: 4, mb: 1.5 }}>{children}</Typography>
);
const H3 = ({ children }) => (
  <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#E8ECF1', mt: 2.5, mb: 1 }}>{children}</Typography>
);
const Li = ({ children }) => (
  <Box component="li" sx={{ mb: 0.5 }}>{children}</Box>
);

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#0D1B2A',
      color: '#E8ECF1',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Header */}
      <Box sx={{
        borderBottom: '1px solid rgba(2,192,154,0.15)',
        bgcolor: 'rgba(13, 27, 42, 0.92)',
        backdropFilter: 'blur(12px)',
        px: 3, py: 1.5,
      }}>
        <Box sx={{ maxWidth: 800, mx: 'auto', display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Link onClick={() => navigate('/login')} sx={{ cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'baseline' }}>
            <Box component="span" sx={{ fontWeight: 800, fontSize: '1.35rem', color: '#FFFFFF' }}>Publi</Box>
            <Box component="span" sx={{ fontWeight: 900, fontSize: '1.35rem', color: '#02C39A' }}>Q</Box>
            <Box component="span" sx={{ fontWeight: 800, fontSize: '1.35rem', color: '#FFFFFF' }}>io</Box>
          </Link>
          <Typography sx={{ fontSize: '0.68rem', color: '#5A7A8A', fontWeight: 500 }}>AI Content Studio</Typography>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ maxWidth: 800, mx: 'auto', px: 3, py: { xs: 4, md: 6 } }}>
        <Typography sx={{ fontSize: { xs: '1.6rem', md: '2rem' }, fontWeight: 800, color: '#fff', mb: 1 }}>
          Privacybeleid
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', color: '#8B9DAF', mb: 4 }}>
          Laatst bijgewerkt: 9 april 2026
        </Typography>

        <H2>1. Verwerkingsverantwoordelijke</H2>
        <S>
          PubliQio is een product van HolidaiButler, een handelsnaam van Frank Spooren, gevestigd in Nederland.
          Voor vragen over dit privacybeleid kunt u contact opnemen via{' '}
          <Link href="mailto:info@holidaibutler.com" sx={{ color: '#02C39A' }}>info@holidaibutler.com</Link>.
        </S>

        <H2>2. Welke gegevens verwerken wij?</H2>
        <H3>2.1 Demo-aanvraagformulier</H3>
        <S>
          Wanneer u een demo aanvraagt via ons formulier, verzamelen wij: naam, zakelijk e-mailadres,
          bedrijf/organisatie, functie, telefoonnummer (optioneel) en uw bericht (optioneel).
          Daarnaast worden IP-adres en user-agent opgeslagen voor beveiliging en fraudepreventie.
        </S>
        <H3>2.2 Accountgegevens</H3>
        <S>
          Bij het aanmaken van een account verwerken wij: naam, e-mailadres, wachtwoord (versleuteld opgeslagen
          met bcrypt), rol en gekoppelde organisatie.
        </S>
        <H3>2.3 Gebruiksgegevens</H3>
        <S>
          Wij verzamelen geanonimiseerde gebruiksstatistieken via Simple Analytics (Amsterdam, NL).
          Simple Analytics slaat geen persoonsgegevens, cookies of IP-adressen op.
        </S>

        <H2>3. Doeleinden en rechtsgrondslag</H2>
        <S>
          Wij verwerken uw gegevens uitsluitend voor de volgende doeleinden:
        </S>
        <Box component="ul" sx={{ color: '#C8D0DA', fontSize: '0.92rem', lineHeight: 1.7, pl: 3, mb: 2 }}>
          <Li><strong>Demo-aanvragen afhandelen</strong> — rechtsgrond: toestemming (Art. 6(1)(a) AVG). U geeft expliciet toestemming via het aanvinkveld in het formulier.</Li>
          <Li><strong>Dienstverlening en accountbeheer</strong> — rechtsgrond: uitvoering van de overeenkomst (Art. 6(1)(b) AVG).</Li>
          <Li><strong>Productverbetering</strong> — rechtsgrond: gerechtvaardigd belang (Art. 6(1)(f) AVG), beperkt tot geanonimiseerde gebruiksstatistieken.</Li>
          <Li><strong>Beveiliging en fraudepreventie</strong> — rechtsgrond: gerechtvaardigd belang (Art. 6(1)(f) AVG), beperkt tot IP-adressen en technische metadata.</Li>
        </Box>

        <H2>4. Bewaartermijnen</H2>
        <Box component="ul" sx={{ color: '#C8D0DA', fontSize: '0.92rem', lineHeight: 1.7, pl: 3, mb: 2 }}>
          <Li><strong>Demo-aanvragen:</strong> maximaal 12 maanden na het laatste contact, tenzij er een klantrelatie ontstaat.</Li>
          <Li><strong>Accountgegevens:</strong> gedurende de looptijd van de overeenkomst, plus 30 dagen na beëindiging.</Li>
          <Li><strong>IP-adressen en beveiligingsgegevens:</strong> 30 dagen.</Li>
          <Li><strong>Gebruiksstatistieken:</strong> geanonimiseerd, geen bewaarlimiet.</Li>
        </Box>

        <H2>5. Delen met derden</H2>
        <S>
          Wij delen uw persoonsgegevens niet met derden voor commerciële doeleinden. Wij maken gebruik van
          de volgende verwerkers, allen binnen de Europese Unie:
        </S>
        <Box component="ul" sx={{ color: '#C8D0DA', fontSize: '0.92rem', lineHeight: 1.7, pl: 3, mb: 2 }}>
          <Li><strong>Hetzner Online GmbH</strong> (Gunzenhausen, Duitsland) — serverhosting en database</Li>
          <Li><strong>Mistral AI</strong> (Parijs, Frankrijk) — AI-contentgeneratie</Li>
          <Li><strong>DeepL SE</strong> (Keulen, Duitsland) — vertalingen</Li>
          <Li><strong>Simple Analytics BV</strong> (Amsterdam, Nederland) — geanonimiseerde analytics</Li>
          <Li><strong>MailerLite</strong> (Vilnius, Litouwen) — e-mailcommunicatie</Li>
        </Box>
        <S>
          Er worden <strong>geen gegevens doorgegeven buiten de Europese Economische Ruimte (EER)</strong>.
        </S>

        <H2>6. Beveiliging</H2>
        <S>
          Wij treffen passende technische en organisatorische maatregelen om uw gegevens te beschermen,
          waaronder: versleutelde opslag (AES-256), versleuteld transport (TLS 1.3), toegangscontrole
          op basis van rollen (RBAC), regelmatige beveiligingsaudits, en EU-only infrastructuur.
        </S>

        <H2>7. Cookies</H2>
        <S>
          PubliQio gebruikt geen tracking cookies. Wij plaatsen uitsluitend functionele cookies die noodzakelijk zijn
          voor de werking van de applicatie (sessie-authenticatie). Deze vereisen geen toestemming op grond van de ePrivacy-richtlijn.
        </S>

        <H2>8. Uw rechten</H2>
        <S>
          Op grond van de AVG (GDPR) heeft u de volgende rechten:
        </S>
        <Box component="ul" sx={{ color: '#C8D0DA', fontSize: '0.92rem', lineHeight: 1.7, pl: 3, mb: 2 }}>
          <Li><strong>Recht op inzage</strong> (Art. 15) — U kunt opvragen welke gegevens wij van u verwerken.</Li>
          <Li><strong>Recht op rectificatie</strong> (Art. 16) — U kunt onjuiste gegevens laten corrigeren.</Li>
          <Li><strong>Recht op verwijdering</strong> (Art. 17) — U kunt verzoeken uw gegevens te wissen. Wij verwerken verwijderingsverzoeken binnen 72 uur.</Li>
          <Li><strong>Recht op beperking</strong> (Art. 18) — U kunt verzoeken de verwerking te beperken.</Li>
          <Li><strong>Recht op dataportabiliteit</strong> (Art. 20) — U kunt uw gegevens in een gestructureerd formaat opvragen. Wij leveren exports binnen 24 uur.</Li>
          <Li><strong>Recht op bezwaar</strong> (Art. 21) — U kunt bezwaar maken tegen verwerking op basis van gerechtvaardigd belang.</Li>
          <Li><strong>Recht om toestemming in te trekken</strong> (Art. 7) — U kunt uw toestemming op elk moment intrekken, zonder dat dit afbreuk doet aan de rechtmatigheid van de verwerking vóór intrekking.</Li>
        </Box>
        <S>
          U kunt uw rechten uitoefenen door een e-mail te sturen naar{' '}
          <Link href="mailto:info@holidaibutler.com" sx={{ color: '#02C39A' }}>info@holidaibutler.com</Link>.
          Wij reageren binnen 30 dagen op uw verzoek.
        </S>

        <H2>9. EU AI Act Transparantie</H2>
        <S>
          PubliQio maakt gebruik van kunstmatige intelligentie (Mistral AI, Parijs) voor het genereren van content.
          Alle AI-gegenereerde content wordt duidelijk gemarkeerd conform de EU AI Act. Gebruikers behouden volledige
          controle: elke AI-gegenereerde tekst doorloopt een goedkeuringsworkflow voordat deze gepubliceerd wordt.
        </S>

        <H2>10. Klachten</H2>
        <S>
          Indien u van mening bent dat wij uw persoonsgegevens niet correct verwerken, heeft u het recht een klacht
          in te dienen bij de toezichthoudende autoriteit:
        </S>
        <S>
          <strong>Autoriteit Persoonsgegevens</strong><br />
          Postbus 93374, 2509 AJ Den Haag<br />
          <Link href="https://autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener" sx={{ color: '#02C39A' }}>autoriteitpersoonsgegevens.nl</Link>
        </S>
        <S>
          Indien u in een andere EU-lidstaat bent gevestigd, kunt u een klacht indienen bij de toezichthoudende autoriteit in uw eigen land.
        </S>

        <H2>11. Wijzigingen</H2>
        <S>
          Wij behouden ons het recht voor dit privacybeleid te wijzigen. Substantiële wijzigingen worden 30 dagen
          van tevoren aangekondigd via e-mail aan geregistreerde gebruikers. De datum bovenaan deze pagina geeft
          de laatste wijziging aan.
        </S>

        <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid #1A2332', textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.82rem', color: '#6B7280' }}>
            © 2026 HolidaiButler · PubliQio ·{' '}
            <Link href="mailto:info@holidaibutler.com" sx={{ color: '#02C39A' }}>info@holidaibutler.com</Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
