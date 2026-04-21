import { useState, useRef } from 'react';
import {
  Box, Typography, TextField, InputAdornment, ImageList, ImageListItem,
  ImageListItemBar, Chip, Select, MenuItem, FormControl, InputLabel,
  Pagination, Skeleton, Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PlaceIcon from '@mui/icons-material/Place';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function POIImagesTab({ destId }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const timer = useRef(null);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setQuery(val); setPage(1); }, 500);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['poi-images', destId, query, category, page],
    queryFn: () => client.get('/media/poi-images', {
      params: { destinationId: destId, search: query, category, page, limit: 24 }
    }).then(r => r.data),
    staleTime: 30000,
  });

  const images = data?.data || [];
  const meta = data?.meta || { page: 1, totalPages: 1, total: 0 };
  const categories = data?.filters?.categories || [];

  return (
    <Box>
      {/* Search + Filter bar */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder={t('media.poi.searchPlaceholder', 'Zoek op POI naam, categorie, sfeer...')}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          sx={{ flex: 1, minWidth: 250 }}
        />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>{t('media.poi.category', 'Categorie')}</InputLabel>
          <Select
            value={category}
            label={t('media.poi.category', 'Categorie')}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          >
            <MenuItem value="">{t('media.poi.allCategories', 'Alle categorieën')}</MenuItem>
            {categories.map(c => (
              <MenuItem key={c.category} value={c.category}>
                {c.category} ({c.cnt})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Stats */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {meta.total.toLocaleString()} {t('media.poi.images', 'afbeeldingen')}
        {query && ` — "${query}"`}
        {category && ` — ${category}`}
      </Typography>

      {/* Grid */}
      {isLoading ? (
        <ImageList cols={4} gap={8}>
          {Array.from({ length: 12 }).map((_, i) => (
            <ImageListItem key={i}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
            </ImageListItem>
          ))}
        </ImageList>
      ) : images.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <PlaceIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">{t('media.poi.noResults', 'Geen POI afbeeldingen gevonden')}</Typography>
        </Box>
      ) : (
        <ImageList cols={4} gap={8} sx={{ mt: 0 }}>
          {images.map((img) => (
            <ImageListItem key={img.id} sx={{ borderRadius: 1, overflow: 'hidden', cursor: 'pointer', '&:hover': { opacity: 0.85 } }}>
              <img
                src={`${API_BASE}${img.thumbnail_url}`}
                alt={img.visual_description || img.poi_name}
                loading="lazy"
                style={{ height: 200, objectFit: 'cover', width: '100%' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <ImageListItemBar
                title={img.poi_name}
                subtitle={
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
                    <Chip label={img.poi_category} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.3)' }} />
                    {img.visual_mood && (
                      <Chip label={img.visual_mood} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(2,195,154,0.3)', color: '#fff' }} />
                    )}
                  </Box>
                }
                sx={{ '& .MuiImageListItemBar-title': { fontSize: '0.8rem', fontWeight: 600 } }}
              />
              {img.visual_description && (
                <Tooltip title={img.visual_description} placement="top">
                  <Box sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                    i
                  </Box>
                </Tooltip>
              )}
            </ImageListItem>
          ))}
        </ImageList>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={meta.totalPages}
            page={page}
            onChange={(_, v) => setPage(v)}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
}
