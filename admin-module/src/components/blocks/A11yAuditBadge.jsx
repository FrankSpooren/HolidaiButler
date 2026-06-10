import { useMemo } from 'react';
import { Chip, Tooltip, Box, Typography } from '@mui/material';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import { useDestination } from './DestinationContext.jsx';

/**
 * A11yAuditBadge — WCAG 2.1 AA quick-audit per block.
 *
 * 4 checks per Frank's Note.md F7 spec:
 *   1. Alt-text aanwezigheid op image-velden
 *   2. Color contrast tegen huisstijl (branding.colors achtergrond)
 *   3. Heading hierarchy in rich-text content (geen h1/h2 skip)
 *   4. Touch-target min 44px (button styles)
 *
 * Renders compact chip met "X/4 OK" + detail-tooltip (Frank Stijl B).
 *
 * @version BLOK F7 (22-05-2026)
 */

// =============================================================================
// WCAG 2.1 AA contrast helpers
// =============================================================================

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return { r: parseInt(clean[0] + clean[0], 16), g: parseInt(clean[1] + clean[1], 16), b: parseInt(clean[2] + clean[2], 16) };
  }
  if (clean.length === 6) {
    return { r: parseInt(clean.slice(0, 2), 16), g: parseInt(clean.slice(2, 4), 16), b: parseInt(clean.slice(4, 6), 16) };
  }
  return null;
}

function relativeLuminance({ r, g, b }) {
  const norm = [r, g, b].map(c => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * norm[0] + 0.7152 * norm[1] + 0.0722 * norm[2];
}

function contrastRatio(hexA, hexB) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return null;
  const lumA = relativeLuminance(a);
  const lumB = relativeLuminance(b);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

// =============================================================================
// Block audit logic
// =============================================================================

function findHtmlInProps(value, results) {
  if (!value) return;
  if (typeof value === 'string' && value.includes('<')) results.push(value);
  if (Array.isArray(value)) { value.forEach(v => findHtmlInProps(v, results)); return; }
  if (typeof value === 'object') Object.values(value).forEach(v => findHtmlInProps(v, results));
}

function findColorPairs(props) {
  const pairs = [];
  if (props?.textStyle?.headlineColor) pairs.push({ fg: props.textStyle.headlineColor, label: 'headline' });
  if (props?.textStyle?.descriptionColor) pairs.push({ fg: props.textStyle.descriptionColor, label: 'description' });
  if (props?.style?.color) pairs.push({ fg: props.style.color, label: 'text' });
  // Button colors
  if (Array.isArray(props?.buttons)) {
    props.buttons.forEach((btn, i) => {
      if (btn?.buttonStyle?.bgColor) pairs.push({ fg: btn.buttonStyle.bgColor, bgOverride: '#ffffff', label: `button ${i + 1} bg`, isButtonBg: true });
    });
  }
  return pairs;
}

function findImageFields(props, missing) {
  if (!props || typeof props !== 'object') return;
  // Top-level image-prop check
  if (props.image && !props.imageAlt && !props.alt) missing.push('block-image');
  // Array van items (gallery/partners/etc.)
  if (Array.isArray(props.items)) {
    props.items.forEach((item, i) => {
      const hasImage = item?.url || item?.image || item?.imageUrl || item?.logo;
      const hasAlt = item?.alt || item?.altText;
      if (hasImage && (!hasAlt || (typeof hasAlt === 'object' && !Object.values(hasAlt).some(v => v && String(v).trim().length > 0)))) {
        missing.push(`item #${i + 1}`);
      }
    });
  }
  // OG image (page level — niet block-niveau, niet checken hier)
}

function checkHeadingHierarchy(htmls) {
  const issues = [];
  for (const html of htmls) {
    const matches = html.match(/<h([1-6])[^>]*>/g) || [];
    let lastLevel = 0;
    for (const m of matches) {
      const lvl = parseInt(m.match(/<h([1-6])/)[1], 10);
      if (lastLevel > 0 && lvl > lastLevel + 1) {
        issues.push(`H${lastLevel} → H${lvl} (overslag)`);
      }
      lastLevel = lvl;
    }
  }
  return issues;
}

function audit(block, brandingColors) {
  const issues = { altText: [], contrast: [], heading: [], touchTarget: [] };
  const props = block?.props || {};

  // 1. Alt-text
  findImageFields(props, issues.altText);

  // 2. Color contrast
  const bgColor = brandingColors?.background || '#ffffff';
  findColorPairs(props).forEach(p => {
    const ratio = contrastRatio(p.fg, p.bgOverride || bgColor);
    if (ratio !== null && ratio < 4.5) {
      issues.contrast.push(`${p.label} ${ratio.toFixed(2)}:1 (<4.5:1 vereist)`);
    }
  });

  // 3. Heading hierarchy in rich HTML
  const htmls = [];
  findHtmlInProps(props, htmls);
  issues.heading.push(...checkHeadingHierarchy(htmls));

  // 4. Touch-target: heuristisch — button-style size='small' bij tap-context
  if (Array.isArray(props.buttons)) {
    props.buttons.forEach((btn, i) => {
      const size = btn?.buttonStyle?.size || btn?.size;
      if (size === 'small' || size === 'xs') {
        issues.touchTarget.push(`button ${i + 1} size=${size} (<44px hoogte)`);
      }
    });
  }

  return issues;
}

// =============================================================================
// Component
// =============================================================================

export default function A11yAuditBadge({ block, branding }) {
  const destCtx = useDestination();
  const brandingColors = branding?.colors || destCtx?.branding?.colors || {};

  const issues = useMemo(() => audit(block, brandingColors), [block, brandingColors]);

  const checksFailed =
    (issues.altText.length > 0 ? 1 : 0) +
    (issues.contrast.length > 0 ? 1 : 0) +
    (issues.heading.length > 0 ? 1 : 0) +
    (issues.touchTarget.length > 0 ? 1 : 0);
  const totalChecks = 4;
  const okCount = totalChecks - checksFailed;

  let color;
  if (checksFailed === 0) color = 'success';
  else if (checksFailed === 1) color = 'warning';
  else color = 'error';

  const tooltipContent = (
    <Box sx={{ minWidth: 220 }}>
      <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 0.5 }}>
        WCAG 2.1 AA quick-audit · {okCount}/{totalChecks} OK
      </Typography>
      <Typography variant="caption" sx={{ display: 'block' }}>
        {issues.altText.length === 0 ? '✓' : '✗'} Alt-text {issues.altText.length > 0 && `(${issues.altText.length} ontbreken: ${issues.altText.slice(0,3).join(', ')})`}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block' }}>
        {issues.contrast.length === 0 ? '✓' : '✗'} Color contrast {issues.contrast.length > 0 && `(${issues.contrast.join('; ')})`}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block' }}>
        {issues.heading.length === 0 ? '✓' : '✗'} Heading hierarchy {issues.heading.length > 0 && `(${issues.heading.join('; ')})`}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block' }}>
        {issues.touchTarget.length === 0 ? '✓' : '✗'} Touch-target 44px {issues.touchTarget.length > 0 && `(${issues.touchTarget.join('; ')})`}
      </Typography>
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} arrow placement="top">
      <Chip
        icon={<AccessibilityNewIcon sx={{ fontSize: '0.85rem !important' }} />}
        label={`${okCount}/${totalChecks}`}
        size="small"
        color={color}
        variant={checksFailed === 0 ? 'filled' : 'outlined'}
        sx={{ height: 20, fontSize: '0.65rem', '& .MuiChip-icon': { ml: 0.5 } }}
      />
    </Tooltip>
  );
}
