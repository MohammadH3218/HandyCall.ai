'use client';

import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import { useEffect, useRef, useState } from 'react';
import { IconCurrentLocation, IconMinus, IconPlus } from '@tabler/icons-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

// Riyadh city centre
const DEFAULT_CENTER: [number, number] = [46.6753, 24.7136]; // [lng, lat] for Mapbox

export default function CustomerAddressMap({
  latitude,
  longitude,
  onPositionChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onPositionChange: (position: { lat: number; lng: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [ready, setReady] = useState(false);

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const initialCenter: [number, number] =
      longitude !== null && latitude !== null
        ? [longitude, latitude]
        : DEFAULT_CENTER;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialCenter,
      zoom: longitude !== null && latitude !== null ? 16 : 12,
      attributionControl: false,
    });

    // Custom compact attribution
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');

    // Draggable pin marker
    const el = document.createElement('div');
    el.className = 'mapbox-custom-pin';
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-100%)">
        <div style="background:#059669;border-radius:50%;padding:10px;color:#fff;box-shadow:0 8px 24px rgba(5,150,105,0.4)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 13-8 13s-8-7-8-13a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div style="width:4px;height:14px;background:#047857;border-radius:0 0 4px 4px;margin-top:-2px"></div>
      </div>
    `;

    const marker = new mapboxgl.Marker({ element: el, draggable: true, anchor: 'bottom' })
      .setLngLat(initialCenter)
      .addTo(map);

    markerRef.current = marker;

    // Report position when marker drag ends
    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      onPositionChange({ lat: lngLat.lat, lng: lngLat.lng });
    });

    // Click on map moves the marker
    map.on('click', (e) => {
      marker.setLngLat(e.lngLat);
      map.flyTo({ center: e.lngLat, zoom: Math.max(map.getZoom(), 16), duration: 350 });
      onPositionChange({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    map.on('load', () => setReady(true));

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external lat/lng changes to the marker (e.g. profile prefill)
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    if (latitude === null || longitude === null) return;

    const lngLat: [number, number] = [longitude, latitude];
    markerRef.current.setLngLat(lngLat);
    mapRef.current.flyTo({ center: lngLat, zoom: Math.max(mapRef.current.getZoom(), 16), duration: 500 });
  }, [latitude, longitude]);

  const handleLocateMe = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onPositionChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 shadow-sm">
      <div ref={containerRef} className="h-[380px] w-full md:h-[480px]" />

      {/* Zoom + locate toolbar */}
      {ready && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-10 flex flex-col gap-2">
          <div className="pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            <button
              type="button"
              onClick={() => mapRef.current?.zoomIn()}
              className="flex h-11 w-11 items-center justify-center border-b border-slate-200 text-slate-700 transition hover:bg-slate-50"
              aria-label="Zoom in"
            >
              <IconPlus className="h-4 w-4" stroke={2} />
            </button>
            <button
              type="button"
              onClick={() => mapRef.current?.zoomOut()}
              className="flex h-11 w-11 items-center justify-center text-slate-700 transition hover:bg-slate-50"
              aria-label="Zoom out"
            >
              <IconMinus className="h-4 w-4" stroke={2} />
            </button>
          </div>
          <button
            type="button"
            onClick={handleLocateMe}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-lg transition hover:bg-slate-50"
            aria-label="Use my current location"
          >
            <IconCurrentLocation className="h-4 w-4" stroke={2} />
          </button>
        </div>
      )}
    </div>
  );
}
