"use client";

import { useEffect, useRef } from "react";
import type {
  LatLngExpression,
  Map as LeafletMap,
  Marker as LeafletMarker,
  Polygon as LeafletPolygon,
} from "leaflet";

import { OBOUR_MAP_CENTER } from "@/lib/maps";
import type { LngLatPair } from "@/lib/district-polygon";

export type MapDistrictOverlay = {
  id: string;
  name: string;
  ring: LngLatPair[] | null;
};

type DistrictPolygonMapProps = {
  ring: LngLatPair[] | null;
  overlays: MapDistrictOverlay[];
  activeDistrictId: string | null;
  onChange: (ring: LngLatPair[]) => void;
};

function toLatLngs(ring: LngLatPair[]): LatLngExpression[] {
  const open =
    ring.length >= 2 &&
    ring[0]![0] === ring[ring.length - 1]![0] &&
    ring[0]![1] === ring[ring.length - 1]![1]
      ? ring.slice(0, -1)
      : ring;
  return open.map(([lng, lat]) => [lat, lng] as LatLngExpression);
}

function fromLatLngs(
  points: Array<{ lat: number; lng: number }>,
): LngLatPair[] {
  return points.map((p) => [p.lng, p.lat]);
}

export function DistrictPolygonMap({
  ring,
  overlays,
  activeDistrictId,
  onChange,
}: DistrictPolygonMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const polygonRef = useRef<LeafletPolygon | null>(null);
  const markersRef = useRef<LeafletMarker[]>([]);
  const overlayPolysRef = useRef<LeafletPolygon[]>([]);
  const onChangeRef = useRef(onChange);
  const ringRef = useRef(ring);

  onChangeRef.current = onChange;
  ringRef.current = ring;

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (cancelled || !containerRef.current || mapRef.current) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current).setView(
        [OBOUR_MAP_CENTER.latitude, OBOUR_MAP_CENTER.longitude],
        13,
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      map.on("click", (event) => {
        const current = ringRef.current ?? [];
        const open =
          current.length >= 2 &&
          current[0]![0] === current[current.length - 1]![0] &&
          current[0]![1] === current[current.length - 1]![1]
            ? current.slice(0, -1)
            : [...current];
        open.push([event.latlng.lng, event.latlng.lat]);
        onChangeRef.current(open);
      });

      mapRef.current = map;
    }

    void setup();

    return () => {
      cancelled = true;
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];
      polygonRef.current?.remove();
      polygonRef.current = null;
      for (const poly of overlayPolysRef.current) {
        poly.remove();
      }
      overlayPolysRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    let cancelled = false;

    async function redraw() {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) {
        return;
      }
      const liveMap = mapRef.current;

      for (const poly of overlayPolysRef.current) {
        poly.remove();
      }
      overlayPolysRef.current = [];

      for (const overlay of overlays) {
        if (
          !overlay.ring ||
          overlay.ring.length < 3 ||
          overlay.id === activeDistrictId
        ) {
          continue;
        }
        const poly = L.polygon(toLatLngs(overlay.ring), {
          color: "#94a3b8",
          weight: 1,
          fillColor: "#cbd5e1",
          fillOpacity: 0.25,
          interactive: false,
        }).addTo(liveMap);
        poly.bindTooltip(overlay.name, { sticky: true });
        overlayPolysRef.current.push(poly);
      }

      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];
      polygonRef.current?.remove();
      polygonRef.current = null;

      const current = ring ?? [];
      const open =
        current.length >= 2 &&
        current[0]![0] === current[current.length - 1]![0] &&
        current[0]![1] === current[current.length - 1]![1]
          ? current.slice(0, -1)
          : current;

      if (open.length >= 2) {
        const poly = L.polygon(toLatLngs(open), {
          color: "#c45c26",
          weight: 2,
          fillColor: "#c45c26",
          fillOpacity: 0.35,
        }).addTo(liveMap);
        polygonRef.current = poly;
      }

      open.forEach((point, index) => {
        const marker = L.marker([point[1], point[0]], {
          draggable: true,
        }).addTo(liveMap);
        marker.on("dragend", () => {
          const next = fromLatLngs(
            markersRef.current.map((m) => m.getLatLng()),
          );
          onChangeRef.current(next);
        });
        marker.on("click", (event) => {
          // Avoid map click adding a point when clicking a vertex
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (event as any).originalEvent?.stopPropagation?.();
        });
        markersRef.current[index] = marker;
      });

      if (open.length > 0) {
        const bounds = L.latLngBounds(
          open.map(([lng, lat]) => [lat, lng] as [number, number]),
        );
        liveMap.fitBounds(bounds.pad(0.2));
      }
    }

    void redraw();

    return () => {
      cancelled = true;
    };
  }, [ring, overlays, activeDistrictId]);

  return (
    <div
      ref={containerRef}
      className="h-[420px] w-full overflow-hidden rounded-2xl border border-zinc-200"
    />
  );
}
