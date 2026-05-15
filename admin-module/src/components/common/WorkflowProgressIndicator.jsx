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
import { Box, Chip, Tooltip } from '@mui/material';
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
                variant={isCurrent ? 'filled' : 'outlined'}
                sx={{
                  bgcolor: isCurrent ? stage.color : 'transparent',
                  color: isCurrent ? '#fff' : isPast ? stage.color : '#bdbdbd',
                  borderColor: isPast ? stage.color : isCurrent ? stage.color : '#e0e0e0',
                  fontWeight: isCurrent ? 700 : 500,
                  height: isCurrent ? chipHeight + 2 : chipHeight,
                  fontSize: isCurrent ? fontSize + 1 : fontSize,
                  opacity: isCurrent ? 1 : isPast ? 0.55 : 0.4,
                  boxShadow: isCurrent ? `0 0 0 2px ${stage.color}40` : 'none',
                  '& .MuiChip-icon': { color: isCurrent ? '#fff' : isPast ? stage.color : '#bdbdbd' },
                  transition: 'all 200ms ease',
                }}
              />
            </Tooltip>
            {idx < stages.length - 1 && (
              <ArrowRightIcon sx={{ fontSize: iconSize, color: isPast ? '#bdbdbd' : '#e0e0e0', opacity: isCurrent ? 0.8 : 0.4 }} />
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
}
