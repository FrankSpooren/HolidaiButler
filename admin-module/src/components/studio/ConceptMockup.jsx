import { Box, Typography } from '@mui/material';

/**
 * Pure CSS mockup of the ConceptDialog with platform tabs.
 * Placeholder visual for the studio landing hero — no external assets.
 * Can be replaced later with a real screenshot.
 */
const PLATFORMS = [
  { key: 'blog', label: 'Blog', color: '#5E8B7E', active: true },
  { key: 'fb', label: 'Facebook', color: '#1877F2' },
  { key: 'ig', label: 'Instagram', color: '#E4405F' },
  { key: 'li', label: 'LinkedIn', color: '#0A66C2' },
  { key: 'x', label: 'X', color: '#111' },
];

export default function ConceptMockup() {
  return (
    <Box sx={{
      width: '100%',
      maxWidth: 520,
      aspectRatio: '5 / 4',
      bgcolor: '#fff',
      borderRadius: '14px',
      boxShadow: '0 24px 60px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', sans-serif",
      transform: { xs: 'none', md: 'perspective(1400px) rotateY(-4deg) rotateX(2deg)' },
      transformOrigin: 'center',
    }}>
      {/* Mock window chrome */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 0.75,
        px: 2, py: 1.25,
        bgcolor: '#F3F4F6',
        borderBottom: '1px solid #E5E7EB',
      }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#EF4444' }} />
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#F59E0B' }} />
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#10B981' }} />
        <Typography sx={{ ml: 1.5, fontSize: '0.7rem', color: '#6B7280', fontWeight: 500 }}>
          Content Studio — Concept
        </Typography>
      </Box>

      {/* Platform tabs */}
      <Box sx={{ display: 'flex', borderBottom: '2px solid #E5E7EB', px: 1.5, pt: 1 }}>
        {PLATFORMS.map(p => (
          <Box key={p.key} sx={{
            px: 1.5, py: 1,
            fontSize: '0.72rem',
            fontWeight: p.active ? 700 : 500,
            color: p.active ? p.color : '#6B7280',
            borderBottom: p.active ? `2px solid ${p.color}` : '2px solid transparent',
            mb: '-2px',
            whiteSpace: 'nowrap',
          }}>
            {p.label}
          </Box>
        ))}
        <Box sx={{ px: 1.5, py: 1, fontSize: '0.72rem', color: '#9CA3AF' }}>+ Platform</Box>
      </Box>

      {/* Body: 2 cols — editor + score panel */}
      <Box sx={{ flex: 1, display: 'flex', p: 2, gap: 2, minHeight: 0 }}>
        {/* Editor */}
        <Box sx={{ flex: 1.4, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ height: 14, bgcolor: '#111827', borderRadius: 1, width: '72%' }} />
          <Box sx={{ height: 8, bgcolor: '#E5E7EB', borderRadius: 1, width: '100%' }} />
          <Box sx={{ height: 8, bgcolor: '#E5E7EB', borderRadius: 1, width: '94%' }} />
          <Box sx={{ height: 8, bgcolor: '#E5E7EB', borderRadius: 1, width: '88%' }} />
          <Box sx={{ height: 8, bgcolor: '#E5E7EB', borderRadius: 1, width: '96%' }} />
          <Box sx={{ height: 8, bgcolor: '#E5E7EB', borderRadius: 1, width: '70%' }} />
          <Box sx={{ mt: 1, height: 60, bgcolor: '#F3F4F6', borderRadius: 1.5,
            backgroundImage: 'linear-gradient(135deg, #7FA594 0%, #5E8B7E 100%)', opacity: 0.9 }} />
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
            {['#calpe', '#spain', '#travel', '#food'].map(t => (
              <Box key={t} sx={{
                px: 1, py: 0.25, fontSize: '0.6rem',
                bgcolor: 'rgba(127,165,148,0.12)', color: '#5E8B7E',
                borderRadius: 1, fontWeight: 600,
              }}>{t}</Box>
            ))}
          </Box>
        </Box>

        {/* Score panel */}
        <Box sx={{
          flex: 1,
          bgcolor: '#FAFAF8',
          borderRadius: 2,
          p: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
          border: '1px solid #F3F4F6',
        }}>
          <Box>
            <Typography sx={{ fontSize: '0.6rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              SEO Score
            </Typography>
            <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: '#10B981', lineHeight: 1 }}>
              87
            </Typography>
            <Box sx={{ height: 4, bgcolor: '#E5E7EB', borderRadius: 2, mt: 0.5, overflow: 'hidden' }}>
              <Box sx={{ width: '87%', height: '100%', bgcolor: '#10B981' }} />
            </Box>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.6rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Brand Score
            </Typography>
            <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: '#3B82F6', lineHeight: 1 }}>
              92
            </Typography>
            <Box sx={{ height: 4, bgcolor: '#E5E7EB', borderRadius: 2, mt: 0.5, overflow: 'hidden' }}>
              <Box sx={{ width: '92%', height: '100%', bgcolor: '#3B82F6' }} />
            </Box>
          </Box>
          <Box sx={{ mt: 'auto' }}>
            <Box sx={{
              display: 'inline-block',
              px: 1, py: 0.4,
              bgcolor: '#D4AF37', color: '#fff',
              fontSize: '0.6rem', fontWeight: 700,
              borderRadius: 0.75, textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              ✨ AI-gegenereerd
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
