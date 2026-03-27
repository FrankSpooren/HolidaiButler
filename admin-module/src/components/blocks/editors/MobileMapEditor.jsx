import { NumberField, TranslatableField } from '../fields/index.js';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function MobileMapEditor({ block, onChange }) {
  const { t } = useTranslation();
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <Box sx={{ mb: 2, p: 1.5, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
        <Typography variant="body2" color="text.secondary">
          {t('pages.blockTypes.mobile_map_info', 'Interactieve kaart met top POIs per categorie. Toont gekleurde markers en categorie-filters.')}
        </Typography>
      </Box>
      <NumberField
        label={t('pages.blockTypes.mobile_map_poi_limit', 'Max aantal POI markers')}
        value={props.poiLimit ?? 8}
        onChange={v => update('poiLimit', v)}
        min={3}
        max={20}
      />
      <TranslatableField
        label={t('pages.blockTypes.mobile_map_label', 'Kaart label')}
        value={props.mapLabel || {}}
        onChange={v => update('mapLabel', v)}
      />
    </>
  );
}
