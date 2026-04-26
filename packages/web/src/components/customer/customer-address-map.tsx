'use client';

import { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { type LatLngExpression } from 'leaflet';
import { IconCurrentLocation, IconMapPin, IconZoomIn, IconZoomOut } from '@tabler/icons-react';

const DEFAULT_CENTER: [number, number] = [24.7136, 46.6753];

function MapViewport({
  center,
  hasPinnedLocation,
}: {
  center: LatLngExpression;
  hasPinnedLocation: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, hasPinnedLocation ? Math.max(map.getZoom(), 16) : Math.max(map.getZoom(), 12), {
      animate: true,
    });
  }, [center, hasPinnedLocation, map]);

  return null;
}

function MapInteractionHandler({
  onPositionChange,
}: {
  onPositionChange: (position: { lat: number; lng: number }) => void;
}) {
  const hasMountedRef = useRef(false);
  const map = useMapEvents({
    click(event) {
      map.flyTo(event.latlng, Math.max(map.getZoom(), 17), { animate: true, duration: 0.35 });
      onPositionChange({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
    moveend() {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }
      const center = map.getCenter();
      onPositionChange({
        lat: center.lat,
        lng: center.lng,
      });
    },
  });

  return null;
}

function MapToolbar({
  onLocateMe,
}: {
  onLocateMe: () => void;
}) {
  const map = useMap();

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-[500] flex flex-col gap-2">
      <div className="pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
        <button
          type="button"
          onClick={() => map.zoomIn()}
          className="flex h-11 w-11 items-center justify-center border-b border-slate-200 text-slate-700 transition hover:bg-slate-50"
          aria-label="Zoom in"
        >
          <IconZoomIn className="h-4 w-4" stroke={2} />
        </button>
        <button
          type="button"
          onClick={() => map.zoomOut()}
          className="flex h-11 w-11 items-center justify-center text-slate-700 transition hover:bg-slate-50"
          aria-label="Zoom out"
        >
          <IconZoomOut className="h-4 w-4" stroke={2} />
        </button>
      </div>
      <button
        type="button"
        onClick={onLocateMe}
        className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-lg transition hover:bg-slate-50"
        aria-label="Use my current location"
      >
        <IconCurrentLocation className="h-4 w-4" stroke={2} />
      </button>
    </div>
  );
}

export default function CustomerAddressMap({
  latitude,
  longitude,
  onPositionChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onPositionChange: (position: { lat: number; lng: number }) => void;
}) {
  const markerPosition: [number, number] =
    latitude !== null && longitude !== null ? [latitude, longitude] : DEFAULT_CENTER;

  const handleLocateMe = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onPositionChange({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 shadow-sm">
      <MapContainer
        center={markerPosition}
        zoom={latitude !== null && longitude !== null ? 16 : 12}
        zoomControl={false}
        scrollWheelZoom
        className="h-[380px] w-full md:h-[480px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewport
          center={markerPosition}
          hasPinnedLocation={latitude !== null && longitude !== null}
        />
        <MapInteractionHandler onPositionChange={onPositionChange} />
        <MapToolbar onLocateMe={handleLocateMe} />
      </MapContainer>

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[450] -translate-x-1/2 -translate-y-full">
        <div className="flex flex-col items-center">
          <div className="rounded-full bg-emerald-600 p-3 text-white shadow-[0_12px_30px_rgba(5,150,105,0.35)]">
            <IconMapPin className="h-5 w-5" stroke={2.2} />
          </div>
          <div className="-mt-1.5 h-4 w-1 rounded-b-full bg-emerald-700" />
        </div>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[430] h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/60 bg-emerald-200/15" />
    </div>
  );
}
