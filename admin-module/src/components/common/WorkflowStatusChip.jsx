/**
 * WorkflowStatusChip — Single rendering component voor content_items workflow status.
 *
 * Vervangt ALL ad-hoc status-renderingen overal in Content Studio:
 *  - ConceptDialog header badge ('Concept' label)
 *  - ConceptDialog per-platform chip (✔/⏳/✓ emoji)
 *  - ContentItemsTab list rij chip
 *  - ContentCalendarTab calendar item chip + popup chip
 *
 * Gebruik:
 *   <WorkflowStatusChip status="approved" />
 *   <WorkflowStatusChip status={item.approval_status} item={item} size="small" />
 *
 * @version 1.0.0
 */

import React from 'react';
import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PublishedWithChangesIcon from '@mui/icons-material/PublishedWithChanges';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ErrorIcon from '@mui/icons-material/Error';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { getWorkflowStatus } from '../../lib/workflowStatus.js';

const ICON_MAP = {
  EditNoteIcon: EditNoteIcon,
  CheckCircleIcon: CheckCircleIcon,
  ScheduleIcon: ScheduleIcon,
  PublishedWithChangesIcon: PublishedWithChangesIcon,
  CancelIcon: CancelIcon,
  ErrorIcon: ErrorIcon,
  Inventory2Icon: Inventory2Icon,
};

/**
 * @param {Object} props
 * @param {string} props.status - DB approval_status enum value
 * @param {Object} [props.item] - Optional full item (for scheduled_at context awareness)
 * @param {string} [props.size='small'] - 'small' | 'medium'
 * @param {string} [props.variant] - 'filled' (default) | 'outlined'
 * @param {boolean} [props.showIcon=true] - Show stage icon
 * @param {Object} [props.sx] - MUI sx prop overrides
 */
export default function WorkflowStatusChip({ status, item = null, size = 'small', variant = 'filled', showIcon = true, sx = {} }) {
  const { i18n } = useTranslation();
  const locale = i18n.language?.slice(0, 2) || 'nl';
  const wf = getWorkflowStatus(status, item);
  const label = wf.labels[locale] || wf.labels.en || wf.key;
  const Icon = showIcon && wf.icon ? ICON_MAP[wf.icon] : null;

  return (
    <Chip
      label={label}
      size={size}
      variant={variant}
      icon={Icon ? <Icon sx={{ fontSize: size === 'small' ? 16 : 18 }} /> : undefined}
      sx={{
        bgcolor: variant === 'filled' ? wf.color : undefined,
        color: variant === 'filled' ? '#fff' : wf.color,
        borderColor: wf.color,
        fontWeight: 600,
        '& .MuiChip-icon': { color: variant === 'filled' ? '#fff' : wf.color },
        ...sx,
      }}
    />
  );
}
