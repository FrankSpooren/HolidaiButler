import { Box, Button, IconButton, Paper, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

/**
 * Generic repeating items field.
 * @param {Object} props
 * @param {string} props.label - Section label
 * @param {Array} props.value - Array of items
 * @param {function} props.onChange - Called with updated array
 * @param {function} props.renderItem - (item, index, updateItem) => JSX
 * @param {function} props.createItem - () => default new item
 */
export default function ItemListField({ label, value, onChange, renderItem, createItem, disabled, maxItems, sx }) {
  const items = Array.isArray(value) ? value : [];

  const updateItem = (idx, updated) => {
    onChange(items.map((item, i) => i === idx ? (typeof updated === 'function' ? updated(item) : updated) : item));
  };

  const addItem = () => {
    if (maxItems && items.length >= maxItems) return;
    onChange([...items, createItem ? createItem() : {}]);
  };

  const removeItem = (idx) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const moveItem = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const updated = [...items];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    onChange(updated);
  };

  return (
    <Box sx={{ mb: 2, ...sx }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">{label} ({items.length})</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={addItem} disabled={disabled || (maxItems && items.length >= maxItems)}>Add</Button>
      </Box>
      {items.map((item, idx) => (
        <Paper key={idx} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mb: 0.5 }}>
            <IconButton size="small" onClick={() => moveItem(idx, -1)} disabled={disabled || idx === 0}><ArrowUpwardIcon fontSize="small" /></IconButton>
            <IconButton size="small" onClick={() => moveItem(idx, 1)} disabled={disabled || idx === items.length - 1}><ArrowDownwardIcon fontSize="small" /></IconButton>
            <IconButton size="small" onClick={() => removeItem(idx)} disabled={disabled}><DeleteIcon fontSize="small" /></IconButton>
          </Box>
          {renderItem(item, idx, (field, val) => {
            updateItem(idx, { ...item, [field]: val });
          })}
        </Paper>
      ))}
    </Box>
  );
}
