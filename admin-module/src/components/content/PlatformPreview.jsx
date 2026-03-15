import { useState, useMemo } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Chip, LinearProgress, Tooltip, Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TwitterIcon from '@mui/icons-material/Twitter';
import YouTubeIcon from '@mui/icons-material/YouTube';
import PinterestIcon from '@mui/icons-material/Pinterest';
import { useTranslation } from 'react-i18next';

const PLATFORM_RULES = {
  facebook:  { maxChars: 500, optimalRange: [100, 250], emojiRange: [2, 4], hashtagMax: 5, hashtagPos: 'end', imageSpec: '1200×630', icon: FacebookIcon, color: '#1877F2' },
  instagram: { maxChars: 2200, optimalRange: null, emojiRange: [3, 6], hashtagMax: 15, hashtagPos: 'end_separated', imageSpec: '1080×1080', icon: InstagramIcon, color: '#E4405F' },
  linkedin:  { maxChars: 3000, optimalRange: null, emojiRange: [0, 2], hashtagMax: 5, hashtagPos: 'end', imageSpec: '1200×627', icon: LinkedInIcon, color: '#0A66C2' },
  x:         { maxChars: 280, optimalRange: null, emojiRange: [0, 1], hashtagMax: 2, hashtagPos: 'inline', imageSpec: '1200×675', icon: TwitterIcon, color: '#000' },
  tiktok:    { maxChars: 150, optimalRange: null, emojiRange: [1, 3], hashtagMax: 5, hashtagPos: 'end', imageSpec: '1080×1920', icon: null, color: '#000' },
  youtube:   { maxChars: 5000, optimalRange: null, emojiRange: [1, 3], hashtagMax: 15, hashtagPos: 'end', imageSpec: '1280×720', icon: YouTubeIcon, color: '#FF0000' },
  pinterest: { maxChars: 500, optimalRange: null, emojiRange: [0, 2], hashtagMax: 5, hashtagPos: 'end', imageSpec: '1000×1500', icon: PinterestIcon, color: '#BD081C' },
  website:   { maxChars: 50000, optimalRange: null, emojiRange: [0, 0], hashtagMax: 0, hashtagPos: 'none', imageSpec: '1200×630', icon: null, color: '#7FA594' },
};

const PLATFORMS = ['instagram', 'facebook', 'linkedin', 'x', 'tiktok', 'youtube', 'pinterest'];

function countEmoji(text) {
  if (!text) return 0;
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
  return (text.match(emojiRegex) || []).length;
}

function countHashtags(text) {
  if (!text) return 0;
  return (text.match(/#[a-zA-Z0-9àáâãäåèéêëìíîïòóôõöùúûüñçÀ-ÿ]+/g) || []).length;
}

function hasUtmParams(text) {
  if (!text) return false;
  return /utm_source=/i.test(text);
}

function getCharStatus(charCount, maxChars) {
  const pct = charCount / maxChars;
  if (pct > 1) return 'error';
  if (pct > 0.95) return 'error';
  if (pct > 0.80) return 'warning';
  return 'success';
}

function ValidationItem({ label, value, status, detail }) {
  const icons = {
    success: <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />,
    warning: <WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} />,
    error: <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />,
    info: <CheckCircleIcon sx={{ fontSize: 16, color: 'info.main' }} />,
  };
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.4 }}>
      {icons[status] || icons.info}
      <Typography variant="caption" sx={{ flex: 1 }}>{label}</Typography>
      <Typography variant="caption" fontWeight={600}>{value}</Typography>
      {detail && <Typography variant="caption" color="text.secondary">({detail})</Typography>}
    </Box>
  );
}

function PlatformMockup({ platform, content, rules }) {
  const text = content || '';
  const charCount = text.length;
  const emojiCount = countEmoji(text);
  const hashtagCount = countHashtags(text);
  const hasUtm = hasUtmParams(text);

  // Truncate for preview
  const previewText = text.length > 300 ? text.substring(0, 297) + '...' : text;
  // Extract first line as "hook" for Instagram
  const firstLine = text.split('\n')[0] || '';

  return (
    <Box>
      {/* Mock device frame */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, maxWidth: 400, mx: 'auto', bgcolor: 'background.default' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: rules.color, opacity: 0.2 }} />
          <Typography variant="body2" fontWeight={600}>destination_name</Typography>
        </Box>

        {/* Image placeholder */}
        <Box sx={{
          width: '100%',
          paddingTop: platform === 'instagram' ? '100%' : platform === 'pinterest' ? '150%' : platform === 'tiktok' ? '177%' : '52.5%',
          bgcolor: 'action.hover',
          borderRadius: 1,
          mb: 1.5,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <Typography variant="caption" color="text.secondary">{rules.imageSpec}</Typography>
          </Box>
        </Box>

        {/* Engagement icons (Instagram/Facebook style) */}
        {['instagram', 'facebook'].includes(platform) && (
          <Box sx={{ display: 'flex', gap: 2, mb: 1, fontSize: 18 }}>
            <span>❤️</span><span>💬</span><span>📤</span>
            <Box sx={{ flex: 1 }} />
            <span>🔖</span>
          </Box>
        )}

        {/* Caption/text preview */}
        <Typography variant="body2" sx={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontSize: 13,
          lineHeight: 1.5,
          maxHeight: 150,
          overflow: 'auto',
          color: 'text.primary',
        }}>
          {platform === 'instagram' ? (
            <>
              <strong>{firstLine}</strong>
              {text.length > firstLine.length && (
                <Typography component="span" variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                  {'\n'}...meer
                </Typography>
              )}
            </>
          ) : previewText}
        </Typography>
      </Paper>

      {/* Validation checks */}
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Typography variant="subtitle2" gutterBottom>Validatie</Typography>
        <ValidationItem
          label="Characters"
          value={`${charCount}/${rules.maxChars}`}
          status={getCharStatus(charCount, rules.maxChars)}
        />
        <LinearProgress
          variant="determinate"
          value={Math.min(100, (charCount / rules.maxChars) * 100)}
          color={getCharStatus(charCount, rules.maxChars)}
          sx={{ height: 4, borderRadius: 2, mb: 0.5 }}
        />
        <ValidationItem
          label="Image"
          value={rules.imageSpec}
          status="info"
          detail="aanbevolen"
        />
        {rules.hashtagMax > 0 && (
          <ValidationItem
            label="Hashtags"
            value={hashtagCount}
            status={hashtagCount === 0 ? 'warning' : hashtagCount <= rules.hashtagMax ? 'success' : 'error'}
            detail={`max ${rules.hashtagMax}`}
          />
        )}
        <ValidationItem
          label="Emoji"
          value={emojiCount}
          status={
            emojiCount >= rules.emojiRange[0] && emojiCount <= rules.emojiRange[1] ? 'success' :
            emojiCount === 0 && rules.emojiRange[0] > 0 ? 'warning' : 'info'
          }
          detail={rules.emojiRange[0] === rules.emojiRange[1] && rules.emojiRange[0] === 0 ? 'n.v.t.' : `${rules.emojiRange[0]}-${rules.emojiRange[1]} optimaal`}
        />
        {hasUtm && (
          <ValidationItem label="UTM tracking" value="✓" status="success" />
        )}
      </Paper>
    </Box>
  );
}

export default function PlatformPreview({ content, targetPlatform, selectedLanguage = 'en' }) {
  const { t } = useTranslation();
  const [activePlatform, setActivePlatform] = useState(targetPlatform || 'instagram');

  // Get body text for selected language
  const bodyText = useMemo(() => {
    if (!content) return '';
    return content[`body_${selectedLanguage}`] || content.body_en || '';
  }, [content, selectedLanguage]);

  const rules = PLATFORM_RULES[activePlatform] || PLATFORM_RULES.instagram;

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {t('contentStudio.platformPreview', 'Platform Preview')}
      </Typography>

      <Tabs
        value={activePlatform}
        onChange={(_, v) => setActivePlatform(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, minHeight: 36 }}
      >
        {PLATFORMS.map(p => {
          const r = PLATFORM_RULES[p];
          const Icon = r.icon;
          return (
            <Tab
              key={p}
              value={p}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {Icon && <Icon sx={{ fontSize: 16, color: r.color }} />}
                  <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>{p === 'x' ? 'X' : p}</Typography>
                </Box>
              }
              sx={{ minHeight: 36, py: 0 }}
            />
          );
        })}
      </Tabs>

      <PlatformMockup platform={activePlatform} content={bodyText} rules={rules} />
    </Box>
  );
}
