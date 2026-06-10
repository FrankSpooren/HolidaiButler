import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { NumberField, SwitchField, CategoryFilterField, TextField } from '../fields/index.js';
import { useDestination } from '../DestinationContext.jsx';

/**
 * MapEditor — i18n-aware: pre-fill lat/lng vanuit DestinationContext
 * (destinations.latitude/longitude of branding.lat/lng fallback).
 *
 * Interactive preview met draggable Marker:
 *   - Klik "Centreer op destinatie" -> reset naar context coordinates
 *   - Sleep marker -> update block.props.center realtime
 *
 * Backend block-data ongewijzigd: props.center blijft [lat, lng] array.
 *
 * @version BLOK E1 (22-05-2026)
 */

// Leaflet default-icon fix voor Vite/bundlers (icon images niet auto-resolved)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function FlyToCenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, map.getZoom(), { duration: 0.6 });
    }
  }, [center, map]);
  return null;
}

export default function MapEditor({ block, onChange }) {
  const props = block.props || {};
  const { latitude: destLat, longitude: destLng, destinationName } = useDestination();
  const markerRef = useRef(null);

  // Initial center fallback chain: block.props.center > destination > [0, 0]
  const initialCenter = (() => {
    if (Array.isArray(props.center) && props.center[0] && props.center[1]) return props.center;
    if (destLat && destLng) return [Number(destLat), Number(destLng)];
    return [52.0, 5.0]; // Sensible default (centrum NL/Europa)
  })();

  const [center, setCenter] = useState(initialCenter);
  const update = (key, val) => onChange({ ...props, [key]: val });

  const handleAutoFill = () => {
    if (destLat && destLng) {
      const next = [Number(destLat), Number(destLng)];
      setCenter(next);
      update('center', next);
    }
  };

  const handleDragEnd = () => {
    const marker = markerRef.current;
    if (!marker) return;
    const pos = marker.getLatLng();
    const next = [Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6))];
    setCenter(next);
    update('center', next);
  };

  const handleManualLatChange = (v) => {
    const next = [v || 0, center[1]];
    setCenter(next);
    update('center', next);
  };
  const handleManualLngChange = (v) => {
    const next = [center[0], v || 0];
    setCenter(next);
    update('center', next);
  };

  const hasDestCoords = Boolean(destLat && destLng);
  const isAtDefault = !Array.isArray(props.center) || props.center[0] === 0 || props.center[1] === 0;

  return (
    <>
      {!hasDestCoords && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Geen lat/lng beschikbaar voor deze destinatie. Vul branding.lat + branding.lng of
          destinations.latitude/longitude in voor auto-fill.
        </Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          Kaart-locatie {destinationName ? `(${destinationName})` : ''}
        </Typography>
        <Button
          size="small"
          variant={isAtDefault ? 'contained' : 'outlined'}
          startIcon={<MyLocationIcon />}
          onClick={handleAutoFill}
          disabled={!hasDestCoords}
        >
          Centreer op destinatie
        </Button>
      </Box>

      <Box sx={{ height: 280, mb: 2, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        <MapContainer
          center={center}
          zoom={props.zoom || 13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={center}
            draggable
            eventHandlers={{ dragend: handleDragEnd }}
            ref={markerRef}
          />
          <FlyToCenter center={center} />
        </MapContainer>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Sleep de marker om de exacte locatie in te stellen, of bewerk lat/lng handmatig.
      </Typography>

      <NumberField label="Latitude" value={center[0]} onChange={handleManualLatChange} step={0.0001} />
      <NumberField label="Longitude" value={center[1]} onChange={handleManualLngChange} step={0.0001} />
      <NumberField label="Zoom Level" value={props.zoom || 13} onChange={v => update('zoom', v)} min={1} max={18} />
      <TextField label="Height" value={props.height} onChange={v => update('height', v)} helperText="e.g. 400px or 60vh" />
      <NumberField label="Marker Limit" value={props.markerLimit || 20} onChange={v => update('markerLimit', v)} min={5} max={100} />
      <SwitchField label="Show Legend" value={props.showLegend !== false} onChange={v => update('showLegend', v)} />
      <CategoryFilterField label="Category Filter" value={props.categoryFilter} onChange={v => update('categoryFilter', v)} />
    </>
  );
}
