'use client';

import { useEffect, useRef, useState } from 'react';
import type { MapProps } from '@/types/blocks';
import 'leaflet/dist/leaflet.css';

export default function Map({ center = [38.6447, 0.046], zoom = 14 }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current || loaded) return;

    const loadMap = async () => {
      const L = (await import('leaflet')).default;

      const map = L.map(mapRef.current!, {
        center: center as [number, number],
        zoom,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      setLoaded(true);
    };

    loadMap();
  }, [center, zoom, loaded]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div
        ref={mapRef}
        className="w-full h-[400px] sm:h-[500px] rounded-tenant overflow-hidden shadow-sm"
        aria-label="Interactive map"
      />
    </section>
  );
}
