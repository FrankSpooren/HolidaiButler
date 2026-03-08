import { useState, Suspense } from 'react';
import { Box, Card, IconButton, Typography, Collapse, CircularProgress, Chip } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import * as MuiIcons from '@mui/icons-material';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getBlockMeta } from './blockEditorRegistry.js';
import BlockStyleEditor from './BlockStyleEditor.jsx';

export default function BlockEditorCard({ block, index, onUpdate, onRemove, onDuplicate, onStyleChange }) {
  const [expanded, setExpanded] = useState(false);
  const meta = getBlockMeta(block.type);
  const IconComponent = meta ? (MuiIcons[meta.icon] || MuiIcons.Extension) : MuiIcons.Extension;
  const Editor = meta?.editor;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto'
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      variant="outlined"
      sx={{ mb: 1.5, bgcolor: expanded ? 'background.paper' : 'action.hover' }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <Box {...attributes} {...listeners} sx={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: 'text.disabled' }} onClick={e => e.stopPropagation()}>
          <DragIndicatorIcon fontSize="small" />
        </Box>
        <IconComponent fontSize="small" sx={{ color: 'primary.main' }} />
        <Typography variant="subtitle2" sx={{ flex: 1 }}>
          {meta?.label || block.type.replace('_', ' ')}
        </Typography>
        <Chip label={`#${index + 1}`} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
        <IconButton size="small" onClick={e => { e.stopPropagation(); onDuplicate(); }} title="Duplicate">
          <ContentCopyIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" color="error" onClick={e => { e.stopPropagation(); onRemove(); }} title="Delete">
          <DeleteIcon fontSize="small" />
        </IconButton>
        {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </Box>

      {/* Editor */}
      <Collapse in={expanded}>
        <Box sx={{ px: 2, pb: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          {Editor ? (
            <Suspense fallback={<Box sx={{ py: 2, textAlign: 'center' }}><CircularProgress size={24} /></Box>}>
              <Editor block={block} onChange={newProps => onUpdate(newProps)} />
            </Suspense>
          ) : (
            <Typography variant="body2" color="text.secondary">No editor available for block type "{block.type}"</Typography>
          )}
          <BlockStyleEditor
            style={block.style || {}}
            onChange={newStyle => onStyleChange?.(newStyle)}
          />
        </Box>
      </Collapse>
    </Card>
  );
}
