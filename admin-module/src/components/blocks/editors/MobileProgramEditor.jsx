import { NumberField } from '../fields/index.js';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function MobileProgramEditor({ block, onChange }) {
  const { t } = useTranslation();
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <Box sx={{ mb: 2, p: 1.5, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
        <Typography variant="body2" color="text.secondary">
          {t('pages.blockTypes.mobile_program_info', 'Toont een dagprogramma (ochtend/middag/avond) met POIs en events op basis van het tijdstip. Automatische selectie op rating, categorie en diversiteit.')}
        </Typography>
      </Box>
      <NumberField
        label={t('pages.blockTypes.mobile_program_size', 'Aantal items per dagdeel')}
        value={props.programSize ?? 4}
        onChange={v => update('programSize', v)}
        min={2}
        max={6}
      />
    </>
  );
}
