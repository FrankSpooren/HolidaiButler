import { Box, Typography } from '@mui/material';

/**
 * Dark-themed ConceptDialog mockup matching the studio landing design spec.
 * Pure CSS/MUI — no external assets. Shows an authentic concept with platform
 * tabs, content preview with emoji + hashtags, and score panel with checklist.
 */
const PLATFORMS = [
  { icon: '📘', label: 'Facebook', status: '✅', bg: '#1877F2', color: '#fff' },
  { icon: '📸', label: 'Instagram', status: '⏳', bg: '#E4405F', color: '#fff' },
  { icon: '💼', label: 'LinkedIn', status: '', bg: '#1A2332', color: '#8B9DAF', border: '1px solid #2A3A4A' },
];

const CHECKS = [
  { label: 'Tekenlimiet', icon: '✅' },
  { label: 'Hashtags', icon: '✅' },
  { label: 'Emoji', icon: '✅' },
  { label: 'Call-to-action', icon: '✅' },
  { label: 'Openingshook', icon: '⚠️' },
  { label: 'Leesbaarheid', icon: '✅' },
];

export default function ConceptMockup() {
  return (
    <Box sx={{
      width: '100%',
      maxWidth: 560,
      bgcolor: '#1A2332',
      border: '1px solid #2A3A4A',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      fontFamily: "'Inter', sans-serif",
      transform: { xs: 'none', md: 'perspective(1600px) rotateY(-3deg) rotateX(1deg)' },
      transformOrigin: 'center',
    }}>
      {/* Mockup header */}
      <Box sx={{
        bgcolor: '#15202B',
        px: 2, py: 1.25,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #2A3A4A',
        gap: 1,
      }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
            Tapas Trails in Calpe: A Culinary Adventure
          </Typography>
          <Typography sx={{ fontSize: '0.65rem', color: '#8B9DAF', mt: 0.25 }}>
            Social Post · 3 platformen · 👥 Duitse gezinnen ▾
          </Typography>
        </Box>
        <Box sx={{
          bgcolor: '#028090', color: '#fff',
          px: 1.25, py: 0.4,
          borderRadius: 0.75,
          fontSize: '0.62rem', fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          Concept
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1.5fr 1fr' },
      }}>
        {/* Left: editor */}
        <Box sx={{
          p: 2,
          borderRight: { xs: 'none', sm: '1px solid #2A3A4A' },
          borderBottom: { xs: '1px solid #2A3A4A', sm: 'none' },
        }}>
          {/* Platform tabs */}
          <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5, flexWrap: 'wrap' }}>
            {PLATFORMS.map(p => (
              <Box key={p.label} sx={{
                bgcolor: p.bg,
                color: p.color,
                border: p.border || 'none',
                px: 1.25, py: 0.5,
                borderRadius: 0.75,
                fontSize: '0.62rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}>
                <span>{p.icon}</span>{p.label} {p.status}
              </Box>
            ))}
            <Box sx={{
              px: 1.25, py: 0.5,
              border: '1px dashed #02C39A',
              borderRadius: 0.75,
              fontSize: '0.58rem',
              fontWeight: 700,
              color: '#02C39A',
              display: 'flex', alignItems: 'center',
            }}>
              + Platform
            </Box>
          </Box>

          {/* Textarea */}
          <Box sx={{
            bgcolor: '#0F1923',
            border: '1px solid #2A3A4A',
            borderRadius: 1,
            p: 1.25,
            fontSize: '0.7rem',
            color: '#C8D4E0',
            lineHeight: 1.55,
          }}>
            <Box sx={{ mb: 0.75 }}>Ever walked into a restaurant and instantly known you found THE spot?</Box>
            <Box>🍷 Casa Pepa — legendary grilled sardines</Box>
            <Box>🌊 El Puerto — freshest seafood tapas</Box>
            <Box>🏔️ La Taberna del Peñón — slow-cooked meats</Box>
            <Box sx={{ mt: 0.75 }}>Where's your favorite tapas spot?</Box>
            <Box sx={{ mt: 0.75, color: '#8B9DAF' }}>#CalpeTapas #CostaBlancaFood #MediterraneanCuisine</Box>
          </Box>
          <Typography sx={{ textAlign: 'right', fontSize: '0.58rem', color: '#27AE60', mt: 0.5, fontWeight: 600 }}>
            487/500 ✅
          </Typography>
        </Box>

        {/* Right: score panel */}
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#27AE60', mb: 0.25 }}>
              Social Score 81/100 (A)
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: '#C8D4E0', mb: 1 }}>
              Brand Score 88/100
            </Typography>
          </Box>

          <Box sx={{ fontSize: '0.6rem', color: '#8B9DAF', fontFamily: 'Consolas, monospace', lineHeight: 1.9 }}>
            {CHECKS.map((c, i) => (
              <Box key={c.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box component="span" sx={{ color: '#2A3A4A' }}>{i === CHECKS.length - 1 ? '└' : '├'}</Box>
                <Box component="span" sx={{ flex: 1 }}>{c.label}</Box>
                <Box component="span">{c.icon}</Box>
              </Box>
            ))}
          </Box>

          <Box sx={{
            mt: 1,
            bgcolor: '#1A2332',
            border: '1px solid #1877F2',
            borderRadius: 1,
            p: 1,
            fontSize: '0.58rem',
            color: '#8B9DAF',
          }}>
            <Box sx={{ color: '#E8ECF1', fontWeight: 700, mb: 0.25 }}>Facebook Preview</Box>
            <Box>📷 Afbeelding</Box>
            <Box>Post tekst...</Box>
            <Box sx={{ mt: 0.25 }}>❤️ 💬 ↗️</Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
