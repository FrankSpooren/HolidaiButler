'use client';

import { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

/**
 * Itinerary Block — VII-E2 Batch B, Block B2
 *
 * Multi-stop route planner with OSRM-powered routing.
 * Shows waypoints as a timeline + route on a Leaflet map.
 * Fallback: straight-line distances if OSRM is unavailable.
 */

export interface ItineraryProps {
  source?: 'manual_waypoints' | 'saved_trip';
  manualWaypoints?: Array<{ poiId?: number; name?: string; lat?: number; lon?: number; durationMinutes?: number; notes?: string }>;
  mode?: 'foot' | 'cycling' | 'driving';
  showMap?: boolean;
  showTimeEstimates?: boolean;
  variant?: 'timeline' | 'list' | 'map_split';
  title?: string;
}

interface Waypoint {
  name: string;
  lat: number;
  lon: number;
  durationMinutes?: number;
  notes?: string;
}

interface RouteData {
  distance_km: string;
  duration_min: number;
  geometry: any;
  legs: Array<{ distance_m: number; duration_s: number; summary: string }>;
}

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const MODE_LABELS: Record<string, Record<string, string>> = {
  foot: { en: 'Walking', nl: 'Wandelen', de: 'Zu Fuss', es: 'A pie' },
  cycling: { en: 'Cycling', nl: 'Fietsen', de: 'Radfahren', es: 'En bicicleta' },
  driving: { en: 'Driving', nl: 'Rijden', de: 'Autofahrt', es: 'En coche' },
};

const MODE_ICONS: Record<string, string> = { foot: '🚶', cycling: '🚴', driving: '🚗' };

export default function Itinerary(props: ItineraryProps) {
  const {
    source = 'manual_waypoints',
    manualWaypoints = [],
    mode = 'foot',
    showMap = true,
    showTimeEstimates = true,
    variant = 'timeline',
    title,
  } = props;

  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [osrmDown, setOsrmDown] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMap = useRef<any>(null);

  const locale = typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en';

  // Resolve waypoints
  useEffect(() => {
    if (source === 'saved_trip') {
      try {
        const trip = JSON.parse(localStorage.getItem('hb_my_trip') || '[]');
        // Fetch POI details for each trip item
        const poiItems = trip.filter((i: any) => i.type === 'poi');
        if (poiItems.length < 2) return;

        Promise.all(poiItems.map((i: any) =>
          fetch(`/api/v1/pois/${i.id}`).then(r => r.json()).then(d => {
            const poi = d?.data || d;
            return poi?.latitude ? { name: poi.name, lat: parseFloat(poi.latitude), lon: parseFloat(poi.longitude) } : null;
          }).catch(() => null)
        )).then(results => {
          setWaypoints(results.filter(Boolean) as Waypoint[]);
        });
      } catch { /* empty */ }
    } else {
      const valid = manualWaypoints.filter(w => w.lat && w.lon).map(w => ({
        name: w.name || `Stop ${manualWaypoints.indexOf(w) + 1}`,
        lat: w.lat!,
        lon: w.lon!,
        durationMinutes: w.durationMinutes,
        notes: w.notes,
      }));
      setWaypoints(valid);
    }
  }, [source, manualWaypoints]);

  // Calculate route via OSRM
  useEffect(() => {
    if (waypoints.length < 2) return;

    setLoading(true);
    fetch('/api/v1/itinerary/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waypoints, mode }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.route) {
          setRoute(data.route);
          setOsrmDown(false);
        } else {
          setOsrmDown(true);
        }
        setLoading(false);
      })
      .catch(() => { setOsrmDown(true); setLoading(false); });
  }, [waypoints, mode]);

  // Render map with route
  useEffect(() => {
    if (!showMap || !mapRef.current || leafletMap.current || waypoints.length < 2) return;

    let cancelled = false;
    const initMap = async () => {
      const L = (await import('leaflet')).default;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (cancelled || !mapRef.current) return;
      const map = L.map(mapRef.current, { scrollWheelZoom: false });
      leafletMap.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OSM', maxZoom: 19,
      }).addTo(map);

      // Add numbered markers
      waypoints.forEach((wp, i) => {
        const icon = L.divIcon({
          className: 'hb-itinerary-marker',
          html: `<div style="width:32px;height:32px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px">${i + 1}</div>`,
          iconSize: [32, 32], iconAnchor: [16, 16],
        });
        L.marker([wp.lat, wp.lon], { icon }).bindPopup(`<strong>${wp.name}</strong>`).addTo(map);
      });

      // Draw route line
      if (route?.geometry) {
        const coords = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
        L.polyline(coords, { color: '#3b82f6', weight: 4, opacity: 0.8 }).addTo(map);
      } else {
        // Fallback: straight lines
        const coords = waypoints.map(w => [w.lat, w.lon] as [number, number]);
        L.polyline(coords, { color: '#94a3b8', weight: 2, dashArray: '8 4' }).addTo(map);
      }

      const bounds = waypoints.map(w => [w.lat, w.lon] as [number, number]);
      map.fitBounds(bounds, { padding: [40, 40] });
    };

    initMap();
    return () => { cancelled = true; if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; } };
  }, [waypoints, route, showMap]);

  if (waypoints.length < 2) return null;

  const modeLabel = (MODE_LABELS[mode] as Record<string, string>)?.[locale] || MODE_LABELS[mode]?.en || mode;

  return (
    <section className="itinerary-block" role="region" aria-label={title || 'Itinerary'}>
      {title && <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>}

      {/* Route summary */}
      {(route || osrmDown) && showTimeEstimates && (
        <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-blue-50 text-sm">
          <span>{MODE_ICONS[mode]} {modeLabel}</span>
          {route && (
            <>
              <span className="font-medium">{route.distance_km} km</span>
              <span className="text-gray-500">{formatDuration(route.duration_min)}</span>
            </>
          )}
          {osrmDown && <span className="text-amber-600">⚠ Route service unavailable — showing estimated distances</span>}
        </div>
      )}

      <div className={variant === 'map_split' && showMap ? 'md:grid md:grid-cols-[2fr_3fr] md:gap-4' : ''}>
        {/* Timeline */}
        <div className="space-y-0">
          {waypoints.map((wp, i) => {
            const leg = route?.legs?.[i];
            const isLast = i === waypoints.length - 1;
            return (
              <div key={i}>
                {/* Waypoint */}
                <div className="flex gap-3 items-start">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {i + 1}
                    </div>
                    {!isLast && <div className="w-0.5 h-8 bg-blue-200 my-1" />}
                  </div>
                  <div className="pb-2">
                    <p className="font-medium text-gray-900">{wp.name}</p>
                    {wp.durationMinutes && <span className="text-xs text-gray-500">{formatDuration(wp.durationMinutes)} hier</span>}
                    {wp.notes && <p className="text-xs text-gray-500 mt-0.5">{wp.notes}</p>}
                  </div>
                </div>

                {/* Leg info (between waypoints) */}
                {!isLast && leg && (
                  <div className="flex gap-3 items-center ml-11 mb-2">
                    <span className="text-xs text-gray-400">
                      {(leg.distance_m / 1000).toFixed(1)} km · {formatDuration(Math.round(leg.duration_s / 60))}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Map */}
        {showMap && (
          <div
            ref={mapRef}
            className={`rounded-xl overflow-hidden border border-gray-200 ${variant === 'map_split' ? 'h-full min-h-[300px]' : 'h-[300px] mt-4'}`}
          />
        )}
      </div>
    </section>
  );
}
