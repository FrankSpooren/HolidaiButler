import { NumberField, TranslatableField } from '../fields/index.js';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function TestimonialsEditor({ block, onChange }) {
  const { t } = useTranslation();
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <TranslatableField
        label={t('pages.blockTypes.testimonials_title', 'Section Title')}
        value={props.title}
        onChange={v => update('title', v)}
        helperText="e.g. 'What visitors say' — leave empty for auto i18n"
      />
      <Box sx={{ mb: 2, p: 1.5, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
        <Typography variant="body2" color="text.secondary">
          Toont reviews/testimonials van bezoekers. Data uit de reviews tabel.
        </Typography>
      </Box>
      <NumberField
        label={t('pages.blockTypes.testimonials_limit', 'Aantal reviews')}
        value={props.limit ?? 6}
        onChange={v => update('limit', v)}
        min={1}
        max={20}
      />
      <NumberField
        label={t('pages.blockTypes.testimonials_min_rating', 'Minimale rating')}
        value={props.minRating ?? 4}
        onChange={v => update('minRating', v)}
        min={1}
        max={5}
      />
    </>
  );
}
