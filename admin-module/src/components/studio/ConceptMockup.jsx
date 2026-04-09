import { Box, Typography } from '@mui/material';

/**
 * Realistic ConceptDialog mockup for the landing page hero.
 * Static representation matching the actual Content Studio popup.
 * Uses beach gradient as placeholder image.
 */

const BEACH_GRADIENT = 'linear-gradient(135deg, #43C6AC 0%, #4FACFE 40%, #F5AF19 80%, #F9D423 100%)';
const BEACH_IMAGE = 'https://test.holidaibutler.com/poi-images/15/3f5dfc4e8ef02adf.jpg';

export default function ConceptMockup() {
  return (
    <Box sx={{
      width: '100%',
      maxWidth: 580,
      bgcolor: '#FFFFFF',
      border: '1px solid #E5E7EB',
      borderRadius: '14px',
      overflow: 'hidden',
      boxShadow: '0 25px 70px rgba(0,0,0,0.45), 0 0 0 1px rgba(2,195,154,0.15)',
      fontFamily: "'Inter', sans-serif",
      transform: { xs: 'none', md: 'perspective(1600px) rotateY(-3deg) rotateX(1deg)' },
      transformOrigin: 'center',
    }}>
      {/* ── Header ── */}
      <Box sx={{
        bgcolor: '#F9FAFB',
        px: 2, py: 1.25,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #E5E7EB',
      }}>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827' }}>
              calpe playas
            </Typography>
            <Box component="span" sx={{ fontSize: '0.65rem', color: '#6B7280' }}>✏️</Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: '0.6rem', color: '#6B7280' }}>Social Post</Typography>
            <Box sx={{
              bgcolor: '#FEF3C7', color: '#92400E',
              px: 0.75, py: 0.15, borderRadius: 0.5,
              fontSize: '0.55rem', fontWeight: 700,
            }}>
              Deels live
            </Box>
            <Typography sx={{ fontSize: '0.6rem', color: '#6B7280' }}>2 platformen</Typography>
            <Typography sx={{ fontSize: '0.6rem', color: '#6B7280' }}>👥 Doelgroep</Typography>
          </Box>
        </Box>
        <Box sx={{ fontSize: '0.75rem', color: '#9CA3AF', cursor: 'default' }}>✕</Box>
      </Box>

      {/* ── Platform tabs ── */}
      <Box sx={{
        px: 2, py: 0.75,
        display: 'flex', gap: 0.75, alignItems: 'center',
        borderBottom: '1px solid #E5E7EB',
        bgcolor: '#FAFBFC',
      }}>
        <Box sx={{
          bgcolor: '#1877F2', color: '#fff',
          px: 1.25, py: 0.4, borderRadius: 0.75,
          fontSize: '0.6rem', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 0.4,
        }}>
          📘 Facebook <Box component="span" sx={{ color: '#86EFAC' }}>✓</Box>
        </Box>
        <Box sx={{
          bgcolor: '#FEE2E2', color: '#E4405F',
          px: 1.25, py: 0.4, borderRadius: 0.75,
          fontSize: '0.6rem', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 0.4,
        }}>
          📸 Instagram <Box component="span">🔴</Box>
        </Box>
        <Box sx={{
          px: 1, py: 0.4,
          border: '1px dashed #02C39A',
          borderRadius: 0.75,
          fontSize: '0.55rem', fontWeight: 700,
          color: '#02C39A',
        }}>
          + Platform
        </Box>
      </Box>

      {/* ── Body 2-col ── */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1.4fr 1fr' },
      }}>
        {/* LEFT: image + editor */}
        <Box sx={{
          p: 2,
          borderRight: { xs: 'none', sm: '1px solid #E5E7EB' },
          borderBottom: { xs: '1px solid #E5E7EB', sm: 'none' },
        }}>
          {/* Selected image + alternatives */}
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            <Box sx={{
              width: 72, height: 52, borderRadius: 1,
              background: BEACH_GRADIENT,
              backgroundImage: `url(${BEACH_IMAGE})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              border: '2px solid #02C39A',
              flexShrink: 0,
            }}>
              <Box sx={{
                position: 'absolute', bottom: 2, left: 2,
                bgcolor: '#02C39A', color: '#fff',
                px: 0.5, py: 0.1, borderRadius: 0.4,
                fontSize: '0.45rem', fontWeight: 700,
              }}>
                Actief
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography sx={{ fontSize: '0.55rem', color: '#6B7280', fontWeight: 600 }}>
                Kies een alternatief
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {[...Array(4)].map((_, i) => (
                  <Box key={i} sx={{
                    width: 32, height: 24, borderRadius: 0.5,
                    background: `hsl(${190 + i * 25}, 55%, ${55 + i * 5}%)`,
                    border: '1px solid #E5E7EB',
                  }} />
                ))}
              </Box>
            </Box>
          </Box>

          {/* Facebook label + SEO score */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ fontSize: '0.65rem' }}>📘</Box>
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#111827' }}>Facebook</Typography>
            </Box>
            <Box sx={{
              bgcolor: '#DCFCE7', color: '#166534',
              px: 0.75, py: 0.15, borderRadius: 0.5,
              fontSize: '0.55rem', fontWeight: 700,
            }}>
              SEO 83/100
            </Box>
          </Box>

          {/* Content text */}
          <Box sx={{
            bgcolor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: 1,
            p: 1.25,
            fontSize: '0.62rem',
            color: '#374151',
            lineHeight: 1.55,
          }}>
            <Box>Imagine waking up to golden sands and turquoise waves, this is your morning in Calpe playas!</Box>
            <Box sx={{ mt: 0.5 }}>Which beach steals your heart? Tag your travel buddy! 🌊 😊</Box>
            <Box sx={{ mt: 0.5, color: '#1877F2', fontWeight: 500, fontSize: '0.58rem' }}>
              #CalpePlayas #CostaBlancaMagic #BeachVibes #MediterraneanEscape
            </Box>
          </Box>
        </Box>

        {/* RIGHT: preview + validation */}
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.25, bgcolor: '#FAFBFC' }}>
          {/* FB preview card */}
          <Box sx={{
            bgcolor: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 1,
            overflow: 'hidden',
          }}>
            <Box sx={{ px: 1, py: 0.5 }}>
              <Typography sx={{ fontSize: '0.55rem', color: '#6B7280', fontWeight: 600 }}>destination_name</Typography>
            </Box>
            <Box sx={{
              height: 56,
              background: BEACH_GRADIENT,
              backgroundImage: `url(${BEACH_IMAGE})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }} />
            <Box sx={{ px: 1, py: 0.5 }}>
              <Typography sx={{ fontSize: '0.5rem', color: '#374151', lineHeight: 1.4, maxHeight: 24, overflow: 'hidden' }}>
                Imagine waking up to golden sands and turquoise waves...
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.25, fontSize: '0.5rem', color: '#9CA3AF' }}>
                <span>❤️</span><span>💬</span><span>↗️</span>
              </Box>
            </Box>
          </Box>

          {/* Validatie */}
          <Box>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#374151', mb: 0.5 }}>
              Validatie
            </Typography>
            <Box sx={{ fontSize: '0.55rem', color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 0.35 }}>
              {[
                { label: 'Tekens', value: '477/500', color: '#DC2626', dot: '#DC2626' },
                { label: 'Afbeelding', value: '1200×630', color: '#059669', dot: '#059669' },
                { label: 'Hashtags', value: '0/5', color: '#F59E0B', dot: '#F59E0B' },
                { label: 'Emoji', value: '2', color: '#059669', dot: '#059669' },
                { label: 'UTM tracking', value: 'Actief', color: '#059669', dot: '#059669' },
              ].map(v => (
                <Box key={v.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: v.dot, flexShrink: 0 }} />
                  <Box sx={{ flex: 1 }}>{v.label}</Box>
                  <Box sx={{ color: v.color, fontWeight: 600 }}>{v.value}</Box>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Tip */}
          <Box sx={{
            bgcolor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 0.75,
            p: 0.75,
            fontSize: '0.5rem',
            color: '#166534',
            lineHeight: 1.45,
          }}>
            <Box sx={{ fontWeight: 700, mb: 0.15 }}>Tip:</Box>
            Conversational, vraagstellend. Optimaal 100-250 tokens. Emoji versterkt engagement.
          </Box>
        </Box>
      </Box>

      {/* ── Footer ── */}
      <Box sx={{
        borderTop: '1px solid #E5E7EB',
        px: 2, py: 0.75,
        display: 'flex', justifyContent: 'flex-end',
        bgcolor: '#F9FAFB',
      }}>
        <Box sx={{
          fontSize: '0.6rem', fontWeight: 600, color: '#6B7280',
          cursor: 'default',
        }}>
          Sluiten
        </Box>
      </Box>
    </Box>
  );
}
