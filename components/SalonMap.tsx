'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import markerIconPng from 'leaflet/dist/images/marker-icon.png';
import markerShadowPng from 'leaflet/dist/images/marker-shadow.png';
import { googleMapsUrl } from '@/lib/geo';

interface Salon {
  id: string;
  name: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  distanceKm?: number;
}

// اسم الصالون ومدينته يكتبهما المالك ويراهما كل الزوار داخل نافذة منبثقة تُبنى
// كنص HTML، فلا بد من تعقيمهما وإلا صار اسم صالون يحوي وسمًا ثغرة XSS مخزّنة
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

export default function SalonMap({ salons }: { salons: Salon[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let removeMap: (() => void) | undefined;

    // يجب تحميل leaflet أولًا وتعيينها كمتغير عالمي (window.L) قبل استيراد
    // leaflet.markercluster، لأنه إضافة قديمة الطراز تتوقع L متاحة عالميًا
    (async () => {
      const { default: L } = await import('leaflet');
      (window as unknown as { L: typeof L }).L = L;
      await import('leaflet.markercluster');
      const el = containerRef.current;
      if (cancelled || !el) return;

      const customIcon = L.icon({
        iconUrl: markerIconPng.src,
        shadowUrl: markerShadowPng.src,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const map = L.map(el).setView([26.2285, 50.586], 11);
      removeMap = () => map.remove();

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const clusterGroup = (L as unknown as { markerClusterGroup: () => L.FeatureGroup }).markerClusterGroup();

      const bounds: [number, number][] = [];
      salons.forEach((salon) => {
        if (salon.lat && salon.lng) {
          bounds.push([salon.lat, salon.lng]);
          const distanceLine =
            salon.distanceKm !== undefined ? `<br>المسافة: ${salon.distanceKm.toFixed(1)} كم` : '';
          L.marker([salon.lat, salon.lng], { icon: customIcon })
            .bindPopup(
              `<b>${escapeHtml(salon.name)}</b><br>المدينة: ${escapeHtml(salon.city || '—')}${distanceLine}` +
                `<br><a href="${googleMapsUrl(salon.lat, salon.lng)}" target="_blank" rel="noopener noreferrer">فتح في خرائط قوقل ↗</a>`
            )
            .addTo(clusterGroup);
        }
      });

      map.addLayer(clusterGroup);
      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [30, 30] });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 14);
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
      removeMap?.();
    };
  }, [salons]);

  // حاوية بارتفاع ثابت دائمًا: تبديل العنصر النائب بالخريطة داخلها لا يحرّك
  // ما تحتها (كان يسبب قفزة تخطيط CLS ≈ 0.4 على الجوال)
  return (
    <div className="relative w-full h-[400px] rounded-lg overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 shadow-inner z-0" />
      {!ready && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center text-gray-400 z-10">
          جاري تحميل الخريطة...
        </div>
      )}
    </div>
  );
}
