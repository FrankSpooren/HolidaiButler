/**
 * WorkflowProgressIndicator — Stijl B compact badge-rij.
 *
 * Toont 4 primary workflow stages horizontaal:
 *   [✓ Concept] → [✓ Goedgekeurd] → [⏳ Ingepland] → [○ Gepubliceerd]
 *
 * Past zich aan op concept-level status (derived from items).
 *  - Completed stages: gevuld + checkmark
 *  - Current stage: gevuld + actieve kleur
 *  - Future stages: outline + grijs
 *
 * Plus afgewezen/mislukt als rode status indicator wanneer relevant.
 *
 * @version 1.0.0
 */

import React from 'react';
import { Box, Chip, Tooltip, alpha } from '@mui/material';
import { useTranslation } from 'react-i18next';
import CheckIcon from '@mui/icons-material/Check';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PublishedWithChangesIcon from '@mui/icons-material/PublishedWithChanges';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import CancelIcon from '@mui/icons-material/Cancel';
import ErrorIcon from '@mui/icons-material/Error';
import { getPrimaryStages, deriveConceptWorkflowStatus } from '../../lib/workflowStatus.js';

const ICON_MAP = {
  EditNoteIcon, CheckCircleIcon, ScheduleIcon, PublishedWithChangesIcon, CancelIcon, ErrorIcon,
};

/**
 * @param {Object} props
 * @param {Array} props.items - Array of content_items with approval_status
 * @param {Object} [props.sx] - MUI sx overrides on container
 * @param {boolean} [props.compact=false] - Smaller variant
 */
export default function WorkflowProgressIndicator({ items = [], sx = {}, compact = false }) {
  const { i18n } = useTranslation();
  const locale = i18n.language?.slice(0, 2) || 'nl';
  const stages = getPrimaryStages();
  const current = deriveConceptWorkflowStatus(items);
  const currentStage = current.stage;
  const isError = ['afgewezen', 'mislukt'].includes(current.key);
  const ErrorIconCmp = ICON_MAP[current.icon];

  const chipHeight = compact ? 22 : 28;
  const fontSize = compact ? 11 : 12;
  const iconSize = compact ? 14 : 16;

  if (isError) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ...sx }}>
        <Chip
          icon={ErrorIconCmp ? <ErrorIconCmp sx={{ fontSize: iconSize }} /> : undefined}
          label={current.labels[locale] || current.labels.en}
          size="small"
          sx={{
            bgcolor: current.color,
            color: '#fff',
            fontWeight: 700,
            height: chipHeight,
            fontSize,
            '& .MuiChip-icon': { color: '#fff' },
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', ...sx }}>
      {stages.map((stage, idx) => {
        const isPast = stage.stage < currentStage;
        const isCurrent = stage.stage === currentStage;
        const isFuture = stage.stage > currentStage;
        const Icon = ICON_MAP[stage.icon];
        const label = stage.labels[locale] || stage.labels.en;

        return (
          <React.Fragment key={stage.key}>
            <Tooltip title={isCurrent ? `Huidige fase: ${label}` : isPast ? `Voltooid: ${label}` : `Komend: ${label}`}>
              <Chip
                icon={isPast
                  ? <CheckIcon sx={{ fontSize: iconSize }} />
                  : Icon ? <Icon sx={{ fontSize: iconSize }} /> : undefined}
                label={label}
                size="small"
                variant={(isCurrent || isPast) ? 'filled' : 'outlined'}
                sx={{
                  // C1-POLISH-2 (/ux · WCAG): consistente thema-teal (primary.main) voor
                  // VOLTOOID + ACTIEF i.p.v. de per-stage kleur (stage 1 'Concept' = grijs → klacht).
                  // Labels donker op de teal-vulling (≈9:1, voldoet ≥4.5:1; wit-op-teal zou 2.3:1 zijn).
                  // ACTIEF dominant via ring + bold + groter; VOLTOOID herkenbaar aan het vinkje
                  // (vorm-onderscheid = kleurenblind-veilig). AANKOMEND blijft leesbaar grijs.
                  bgcolor: (isCurrent || isPast) ? 'primary.main' : 'transparent',
                  color: (isCurrent || isPast) ? 'text.primary' : 'text.secondary',
                  borderColor: (isCurrent || isPast) ? 'primary.main' : '#9e9e9e',
                  borderWidth: (isCurrent || isPast) ? 0 : 1.5,
                  fontWeight: isCurrent ? 700 : isPast ? 600 : 500,
                  height: isCurrent ? chipHeight + 2 : chipHeight,
                  fontSize: isCurrent ? fontSize + 1 : fontSize,
                  boxShadow: isCurrent ? (theme) => `0 0 0 3px ${alpha(theme.palette.primary.main, 0.35)}` : 'none',
                  '& .MuiChip-icon': { color: (isCurrent || isPast) ? 'text.primary' : 'text.secondary' },
                  transition: 'all 200ms ease',
                }}
              />
            </Tooltip>
            {idx < stages.length - 1 && (
              <ArrowRightIcon sx={{ fontSize: iconSize, color: isPast ? 'primary.main' : '#9e9e9e' }} />
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
}
