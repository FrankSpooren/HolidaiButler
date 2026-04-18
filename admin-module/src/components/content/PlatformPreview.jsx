import { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Chip, LinearProgress, Tooltip, Divider, Alert,
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
  facebook:  { maxChars: 500, optimalRange: [100, 250], emojiRange: [2, 4], hashtagMax: 5, hashtagPos: 'end', imageSpec: '1200x630', aspectRatio: '1.91:1', icon: FacebookIcon, color: '#1877F2' },
  instagram: { maxChars: 2200, optimalRange: null, emojiRange: [3, 6], hashtagMax: 15, hashtagPos: 'end_separated', imageSpec: '1080x1080', aspectRatio: '1:1', icon: InstagramIcon, color: '#E4405F' },
  linkedin:  { maxChars: 3000, optimalRange: null, emojiRange: [0, 2], hashtagMax: 5, hashtagPos: 'end', imageSpec: '1200x627', aspectRatio: '1.91:1', icon: LinkedInIcon, color: '#0A66C2' },
  x:         { maxChars: 280, optimalRange: null, emojiRange: [0, 1], hashtagMax: 2, hashtagPos: 'inline', imageSpec: '1200x675', aspectRatio: '16:9', icon: TwitterIcon, color: '#000' },
  tiktok:    { maxChars: 150, optimalRange: null, emojiRange: [1, 3], hashtagMax: 5, hashtagPos: 'end', imageSpec: '1080x1920', aspectRatio: '9:16', icon: null, color: '#000' },
  youtube:   { maxChars: 5000, optimalRange: null, emojiRange: [1, 3], hashtagMax: 15, hashtagPos: 'end', imageSpec: '1280x720', aspectRatio: '16:9', icon: YouTubeIcon, color: '#FF0000' },
  pinterest: { maxChars: 500, optimalRange: null, emojiRange: [0, 2], hashtagMax: 5, hashtagPos: 'end', imageSpec: '1000x1500', aspectRatio: '2:3', icon: PinterestIcon, color: '#BD081C' },
  website:   { maxChars: 50000, optimalRange: null, emojiRange: [0, 0], hashtagMax: 0, hashtagPos: 'none', imageSpec: '1200x630', aspectRatio: '1.91:1', icon: null, color: '#7FA594' },
};

const ALL_PLATFORMS = ['instagram', 'facebook', 'linkedin', 'x', 'tiktok', 'youtube', 'pinterest'];

/** Platform-specific content style tips */
const PLATFORM_TIPS = {
  facebook: 'Conversational, vraagstellend. Optimaal 100-250 tekens. Emoji versterkt engagement.',
  instagram: 'Eerste zin is de hook (zichtbaar voor "meer"). Verhalende stijl. Hashtags op aparte regel.',
  linkedin: 'Professioneel, waarde-gedreven. Minimaal emoji. Eerste 2 regels bepalen de klikratio.',
  x: 'Ultra-beknopt, punchy. Hashtags verweven in tekst. Elke letter telt.',
  tiktok: 'Jong, trendy, super kort. Populaire hashtags gebruiken.',
  youtube: 'SEO-rijke beschrijving. Timestamps indien relevant. Links meenemen.',
  pinterest: 'Aspirerend, zoekwoord-rijk. Beschrijvend voor Pinterest zoekfunctie.',
};

function countEmoji(text) {
  if (!text) return 0;
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
  return (text.match(emojiRegex) || []).length;
}

function countHashtags(text) {
  if (!text) return 0;
  return (text.match(/#[a-zA-Z0-9\u00C0-\u024F]+/g) || []).length;
}

function extractHashtags(text) {
  if (!text) return [];
  return text.match(/#[a-zA-Z0-9\u00C0-\u024F]+/g) || [];
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

/**
 * Adapt content for a specific platform — smart truncation, hashtag adjustment, formatting.
 * This shows how the content WOULD look when published to the platform.
 */
function adaptContentForPlatform(text, platform, rules) {
  if (!text) return { adapted: '', changes: [] };
  let adapted = text.trim();
  const changes = [];

  // 1. Remove hashtags for platforms that don't support them (website)
  if (rules.hashtagMax === 0) {
    const hashtagCount = countHashtags(adapted);
    if (hashtagCount > 0) {
      adapted = adapted.replace(/\n*#[a-zA-Z0-9\u00C0-\u024F]+/g, '').trim();
      changes.push(`${hashtagCount} hashtags verwijderd`);
    }
  }

  // 2. Trim excess hashtags
  const currentHashtags = extractHashtags(adapted);
  if (rules.hashtagMax > 0 && currentHashtags.length > rules.hashtagMax) {
    const excess = currentHashtags.slice(rules.hashtagMax);
    for (const tag of excess) {
      adapted = adapted.replace(tag, '').trim();
    }
    adapted = adapted.replace(/\n{3,}/g, '\n\n').trim();
    changes.push(`${excess.length} overtollige hashtags verwijderd (max ${rules.hashtagMax})`);
  }

  // 3. Smart truncation to platform char limit
  if (rules.maxChars && adapted.length > rules.maxChars) {
    const original = adapted.length;
    // Try to truncate at a sentence boundary
    const truncated = adapted.substring(0, rules.maxChars - 10);
    const lastSentence = Math.max(
      truncated.lastIndexOf('. '),
      truncated.lastIndexOf('! '),
      truncated.lastIndexOf('? '),
      truncated.lastIndexOf('\n')
    );
    if (lastSentence > rules.maxChars * 0.6) {
      adapted = truncated.substring(0, lastSentence + 1).trim();
    } else {
      const lastSpace = truncated.lastIndexOf(' ');
      adapted = truncated.substring(0, lastSpace > 0 ? lastSpace : rules.maxChars - 10).trim() + '...';
    }
    changes.push(`Ingekort van ${original} naar ${adapted.length} tekens`);
  }

  // 4. Hashtag position enforcement
  if (rules.hashtagPos === 'end_separated' && countHashtags(adapted) > 0) {
    const hashtags = extractHashtags(adapted);
    let bodyWithoutHashtags = adapted;
    for (const tag of hashtags) {
      bodyWithoutHashtags = bodyWithoutHashtags.replace(tag, '').trim();
    }
    bodyWithoutHashtags = bodyWithoutHashtags.replace(/\n{3,}/g, '\n\n').trim();
    if (bodyWithoutHashtags !== adapted.replace(/\n{3,}/g, '\n\n').trim()) {
      adapted = bodyWithoutHashtags + '\n\n' + hashtags.join(' ');
      changes.push('Hashtags verplaatst naar einde (aparte regel)');
    }
  }

  return { adapted, changes };
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

function PlatformMockup({ platform, content, rules, isTargetPlatform, contentType, images, socialMetadata }) {
  // For blogs on social platforms: show "use Repurpose" message instead of truncated preview
  const isBlogOnSocial = contentType === 'blog' && platform !== 'website' && rules.maxChars < 50000;
  const isOverLimit = rules.maxChars && content.length > rules.maxChars;

  if (isBlogOnSocial && isOverLimit) {
    return (
      <Box>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            Dit blog ({content.length} tekens) is te lang voor {platform} (max {rules.maxChars}).
          </Typography>
          <Typography variant="body2">
            Klik &quot;Repurpose&quot; om een {platform}-versie te genereren met de juiste lengte, stijl en tone-of-voice.
          </Typography>
        </Alert>
        <Paper variant="outlined" sx={{ p: 2, maxHeight: 120, overflow: 'hidden', opacity: 0.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
            {content.substring(0, 200)}...
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.5, mt: 1.5 }}>
          <Typography variant="subtitle2" gutterBottom>Validatie</Typography>
          <ValidationItem label="Tekens" value={`${content.length}/${rules.maxChars}`} status="error" detail="te lang — repurpose nodig" />
          <LinearProgress variant="determinate" value={100} color="error" sx={{ height: 4, borderRadius: 2 }} />
        </Paper>
      </Box>
    );
  }

  const { adapted, changes } = useMemo(
    () => adaptContentForPlatform(content, platform, rules),
    [content, platform, rules]
  );

  const charCount = adapted.length;
  const emojiCount = countEmoji(adapted);
  const hashtagCount = countHashtags(adapted);
  const hasUtm = hasUtmParams(adapted) || hasUtmParams(socialMetadata?.link || '');
  const isInOptimalRange = rules.optimalRange
    ? charCount >= rules.optimalRange[0] && charCount <= rules.optimalRange[1]
    : null;

  // Preview text: show adapted version, not raw
  const previewText = adapted.length > 400 ? adapted.substring(0, 397) + '...' : adapted;
  const firstLine = adapted.split('\n')[0] || '';

  return (
    <Box>
      {/* Platform match indicator */}
      {isTargetPlatform && (
        <Chip label="Doelplatform" size="small" color="primary" sx={{ mb: 1 }} />
      )}

      {/* Adaptation warnings */}
      {changes.length > 0 && (
        <Alert severity="info" sx={{ mb: 1.5, py: 0, '& .MuiAlert-message': { py: 0.5 } }}>
          <Typography variant="caption" fontWeight={600}>Auto-aanpassingen voor {platform}:</Typography>
          {changes.map((c, i) => (
            <Typography key={i} variant="caption" display="block" sx={{ pl: 1 }}>- {c}</Typography>
          ))}
        </Alert>
      )}

      {/* Over-limit warning for non-blog content */}
      {isOverLimit && (
        <Alert severity="warning" sx={{ mb: 1.5, py: 0, '& .MuiAlert-message': { py: 0.5 } }}>
          <Typography variant="caption">
            Originele tekst ({content.length} tekens) overschrijdt {platform} limiet ({rules.maxChars}).
            Gebruik Repurpose om een platform-specifieke versie te genereren.
          </Typography>
        </Alert>
      )}

      {/* Mock device frame */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, maxWidth: 400, mx: 'auto', bgcolor: 'background.default' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: rules.color, opacity: 0.2 }} />
          <Typography variant="body2" fontWeight={600}>destination_name</Typography>
        </Box>

        {/* Content image or placeholder with correct aspect ratio */}
        <Box sx={{
          width: '100%',
          paddingTop: platform === 'instagram' ? '100%' : platform === 'pinterest' ? '150%' : platform === 'tiktok' ? '177%' : '52.5%',
          bgcolor: 'action.hover',
          borderRadius: 1,
          mb: 1.5,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {images && images.length > 0 ? (
            <Box
              component="img"
              src={images[0].url || images[0].thumbnail}
              alt={images[0].alt || 'Content image'}
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              sx={{
                position: 'absolute',
                top: 0, left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : null}
          <Box sx={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            display: images && images.length > 0 ? 'none' : 'flex',
            flexDirection: 'column', alignItems: 'center',
          }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>{rules.imageSpec}</Typography>
            <Typography variant="caption" display="block" color="text.secondary">({rules.aspectRatio})</Typography>
          </Box>
        </Box>

        {/* Engagement icons */}
        {['instagram', 'facebook'].includes(platform) && (
          <Box sx={{ display: 'flex', gap: 2, mb: 1, fontSize: 18 }}>
            <span>❤️</span><span>💬</span><span>📤</span>
            <Box sx={{ flex: 1 }} />
            <span>🔖</span>
          </Box>
        )}
        {platform === 'linkedin' && (
          <Box sx={{ display: 'flex', gap: 2, mb: 1, fontSize: 14, color: 'text.secondary' }}>
            <span>👍 Vind ik leuk</span><span>💬 Reageer</span><span>🔄 Delen</span>
          </Box>
        )}

        {/* Caption/text preview — shows ADAPTED content */}
        <Typography variant="body2" sx={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontSize: 13,
          lineHeight: 1.5,
          maxHeight: 200,
          overflow: 'auto',
          color: 'text.primary',
        }}>
          {platform === 'instagram' ? (
            <>
              <strong>{firstLine}</strong>
              {adapted.length > firstLine.length && (
                <Typography component="span" variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                  {'\n'}...meer
                </Typography>
              )}
            </>
          ) : platform === 'x' ? (
            <Box component="span" sx={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{previewText}</Box>
          ) : previewText}
        </Typography>

        {/* X char counter */}
        {platform === 'x' && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
            <Typography variant="caption" color={charCount > 280 ? 'error.main' : charCount > 260 ? 'warning.main' : 'text.secondary'}>
              {charCount}/280
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Validation checks */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
        <Typography variant="subtitle2" gutterBottom>Validatie</Typography>
        <ValidationItem
          label="Tekens"
          value={`${charCount}/${rules.maxChars}`}
          status={getCharStatus(charCount, rules.maxChars)}
          detail={isInOptimalRange ? 'optimaal' : isInOptimalRange === false ? `optimaal: ${rules.optimalRange[0]}-${rules.optimalRange[1]}` : undefined}
        />
        <LinearProgress
          variant="determinate"
          value={Math.min(100, (charCount / rules.maxChars) * 100)}
          color={getCharStatus(charCount, rules.maxChars)}
          sx={{ height: 4, borderRadius: 2, mb: 0.5 }}
        />
        <ValidationItem
          label="Afbeelding"
          value={rules.imageSpec}
          status="info"
          detail={rules.aspectRatio}
        />
        {rules.hashtagMax > 0 && (
          <ValidationItem
            label="Hashtags"
            value={`${hashtagCount}/${rules.hashtagMax}`}
            status={hashtagCount === 0 ? 'warning' : hashtagCount <= rules.hashtagMax ? 'success' : 'error'}
            detail={rules.hashtagPos === 'inline' ? 'in tekst' : rules.hashtagPos === 'end_separated' ? 'aparte regel' : 'aan einde'}
          />
        )}
        <ValidationItem
          label="Emoji"
          value={emojiCount}
          status={
            emojiCount >= rules.emojiRange[0] && emojiCount <= rules.emojiRange[1] ? 'success' :
            emojiCount === 0 && rules.emojiRange[0] > 0 ? 'warning' :
            emojiCount > rules.emojiRange[1] ? 'error' : 'info'
          }
          detail={rules.emojiRange[0] === rules.emojiRange[1] && rules.emojiRange[0] === 0 ? 'n.v.t.' : `${rules.emojiRange[0]}-${rules.emojiRange[1]} optimaal`}
        />
        {hasUtm && (
          <ValidationItem label="UTM tracking" value="Actief" status="success" detail="link wordt automatisch voorzien van tracking" />
        )}
        {!hasUtm && platform !== 'website' && (
          <ValidationItem label="UTM tracking" value="Ontbreekt" status="warning" detail="genereer opnieuw om toe te voegen" />
        )}
      </Paper>

      {/* Platform tip */}
      {PLATFORM_TIPS[platform] && (
        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Tip:</strong> {PLATFORM_TIPS[platform]}
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

export default function PlatformPreview({ content, targetPlatform, selectedLanguage = 'en', onPlatformChange, availablePlatforms }) {
  const PLATFORMS = availablePlatforms && availablePlatforms.length > 0 ? availablePlatforms : ALL_PLATFORMS;
  const { t } = useTranslation();
  const [activePlatform, setActivePlatform] = useState(targetPlatform || 'instagram');
  useEffect(() => { if (targetPlatform) setActivePlatform(targetPlatform); }, [targetPlatform]);

  // Get body text for selected language
  const bodyText = useMemo(() => {
    if (!content) return '';
    return content[`body_${selectedLanguage}`] || content.body_en || '';
  }, [content, selectedLanguage]);

  const rules = PLATFORM_RULES[activePlatform] || PLATFORM_RULES.instagram;

  // Calculate overall health score per platform
  const platformHealth = useMemo(() => {
    const results = {};
    for (const p of PLATFORMS) {
      const r = PLATFORM_RULES[p];
      if (!bodyText) { results[p] = 'info'; continue; }
      const charOk = !r.maxChars || bodyText.length <= r.maxChars;
      const emojiOk = countEmoji(bodyText) >= r.emojiRange[0] && countEmoji(bodyText) <= r.emojiRange[1];
      const hashtagOk = r.hashtagMax === 0 || (countHashtags(bodyText) > 0 && countHashtags(bodyText) <= r.hashtagMax);
      if (!charOk) results[p] = 'error';
      else if (!emojiOk || !hashtagOk) results[p] = 'warning';
      else results[p] = 'success';
    }
    return results;
  }, [bodyText]);

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {t('contentStudio.platformPreview', 'Platform Preview')}
      </Typography>

      <Tabs
        value={activePlatform}
        onChange={(_, v) => { setActivePlatform(v); if (onPlatformChange) onPlatformChange(v); }}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, minHeight: 36 }}
      >
        {PLATFORMS.map(p => {
          const r = PLATFORM_RULES[p];
          const Icon = r.icon;
          const health = platformHealth[p];
          return (
            <Tab
              key={p}
              value={p}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {Icon && <Icon sx={{ fontSize: 16, color: r.color }} />}
                  <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>{p === 'x' ? 'X' : p}</Typography>
                  {health === 'error' && <ErrorIcon sx={{ fontSize: 12, color: 'error.main' }} />}
                  {health === 'warning' && <WarningIcon sx={{ fontSize: 12, color: 'warning.main' }} />}
                  {health === 'success' && <CheckCircleIcon sx={{ fontSize: 12, color: 'success.main' }} />}
                </Box>
              }
              sx={{ minHeight: 36, py: 0 }}
            />
          );
        })}
      </Tabs>

      <PlatformMockup
        platform={activePlatform}
        content={bodyText}
        rules={rules}
        isTargetPlatform={activePlatform === targetPlatform}
        contentType={content?.content_type}
        images={content?.resolved_images}
        socialMetadata={content?.social_metadata}
      />
    </Box>
  );
}
