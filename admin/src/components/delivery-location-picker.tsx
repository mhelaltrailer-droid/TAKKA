"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";

import { OBOUR_MAP_CENTER, formatCoords } from "@/lib/maps";

export type DeliveryCoords = {
  latitude: number;
  longitude: number;
};

type DeliveryLocationPickerProps = {
  value: DeliveryCoords | null;
  confirmed: boolean;
  onChange: (coords: DeliveryCoords | null) => void;
  onConfirmedChange: (confirmed: boolean) => void;
  initialHint?: DeliveryCoords | null;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

export function DeliveryLocationPicker({
  value,
  confirmed,
  onChange,
  onConfirmedChange,
  initialHint = null,
}: DeliveryLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function setupMap() {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (cancelled || !mapContainerRef.current || mapRef.current) {
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

      const start = value ?? initialHint ?? OBOUR_MAP_CENTER;
      const map = L.map(mapContainerRef.current).setView(
        [start.latitude, start.longitude],
        value || initialHint ? 16 : 13,
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      const marker = L.marker([start.latitude, start.longitude], {
        draggable: true,
      }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onConfirmedChange(false);
        onChange({ latitude: pos.lat, longitude: pos.lng });
        setStatus("حرّك الدبوس ثم اضغط «تأكيد الموقع».");
      });

      map.on("click", (event) => {
        marker.setLatLng(event.latlng);
        onConfirmedChange(false);
        onChange({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        });
        setStatus("حرّك الدبوس ثم اضغط «تأكيد الموقع».");
      });

      mapRef.current = map;
      markerRef.current = marker;
    }

    void setupMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!value || !markerRef.current || !mapRef.current) {
      return;
    }
    markerRef.current.setLatLng([value.latitude, value.longitude]);
    mapRef.current.setView([value.latitude, value.longitude], 16);
  }, [value]);

  function setPin(coords: DeliveryCoords, message: string) {
    onConfirmedChange(false);
    onChange(coords);
    setStatus(message);
    markerRef.current?.setLatLng([coords.latitude, coords.longitude]);
    mapRef.current?.setView([coords.latitude, coords.longitude], 16);
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      setStatus("المتصفح لا يدعم تحديد الموقع. حرّك الدبوس على الخريطة.");
      return;
    }

    setDetecting(true);
    setStatus(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDetecting(false);
        setPin(
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          "تم رصد موقعك. عدّل الدبوس إن لزم ثم أكّد.",
        );
      },
      (error) => {
        setDetecting(false);
        if (error.code === error.PERMISSION_DENIED) {
          setStatus(
            "تعذر رصد موقعك الحالي. حرّك الدبوس على الخريطة أو ابحث عن العنوان.",
          );
        } else {
          setStatus(
            "تعذر رصد الموقع. حرّك الدبوس على الخريطة أو ابحث عن العنوان.",
          );
        }
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function searchLocation() {
    const query = searchQuery.trim();
    if (!query) {
      return;
    }

    setSearching(true);
    setStatus(null);

    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", `${query} العبور مصر`);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "1");

      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });
      const results = (await response.json()) as NominatimResult[];

      if (!results.length) {
        setStatus("لم يتم العثور على نتائج. حرّك الدبوس يدويًا.");
        return;
      }

      const hit = results[0];
      setPin(
        {
          latitude: Number(hit.lat),
          longitude: Number(hit.lon),
        },
        `نتيجة البحث: ${hit.display_name}. أكّد الموقع.`,
      );
    } catch {
      setStatus("تعذر البحث على الخريطة. حاول مرة أخرى.");
    } finally {
      setSearching(false);
    }
  }

  function confirmLocation() {
    if (!value) {
      setStatus("ضع الدبوس على موقع التوصيل ثم أكّد.");
      return;
    }
    onConfirmedChange(true);
    setStatus("تم تأكيد موقع التوصيل.");
  }

  return (
    <div className="space-y-3">
      <div
        ref={mapContainerRef}
        className="h-64 w-full overflow-hidden rounded-2xl border border-zinc-200 z-0"
      />

      <p className="text-xs leading-6 text-zinc-500">
        الدبوس جاهز من عنوانك إن وُجد. عدّله بالسحب أو النقر ثم أكّد مرة واحدة.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={confirmLocation}
          disabled={!value || confirmed}
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {confirmed ? "الموقع مؤكَّد" : "تأكيد الموقع"}
        </button>
        <button
          type="button"
          onClick={detectLocation}
          disabled={detecting}
          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 disabled:opacity-70"
        >
          {detecting ? "جارٍ الرصد..." : "موقعي الحالي"}
        </button>
        <button
          type="button"
          onClick={() => setShowSearch((open) => !open)}
          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800"
        >
          {showSearch ? "إخفاء البحث" : "بحث على الخريطة"}
        </button>
      </div>

      {showSearch ? (
        <div className="flex gap-2">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="ابحث عن موقع على الخريطة..."
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => void searchLocation()}
            disabled={searching}
            className="shrink-0 rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium"
          >
            {searching ? "..." : "بحث"}
          </button>
        </div>
      ) : null}

      {value ? (
        <p className="rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
          الإحداثيات: {formatCoords(value.latitude, value.longitude)}
          {confirmed ? " — مؤكَّدة" : " — بانتظار التأكيد"}
        </p>
      ) : null}

      {status ? (
        <p
          className={`rounded-xl px-3 py-2 text-xs ${
            confirmed
              ? "bg-emerald-50 text-emerald-800"
              : "bg-amber-50 text-amber-900"
          }`}
        >
          {status}
        </p>
      ) : null}
    </div>
  );
}
