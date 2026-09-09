"use client";

import { useEffect, useState } from "react";

import { OBOUR_CITY_NAME, OBOUR_DISTRICTS } from "@/lib/obour-areas";

type ObourLocationFieldsProps = {
  cityFieldName?: string;
  regionFieldName?: string;
  latitudeFieldName?: string;
  longitudeFieldName?: string;
  defaultRegionName?: string;
  defaultLatitude?: number | null;
  defaultLongitude?: number | null;
  regionName?: string;
  onRegionChange?: (regionName: string) => void;
  onCoordsChange?: (coords: { latitude: number; longitude: number } | null) => void;
  showDetectButton?: boolean;
  className?: string;
};

export function ObourLocationFields({
  cityFieldName = "cityName",
  regionFieldName = "regionName",
  latitudeFieldName = "latitude",
  longitudeFieldName = "longitude",
  defaultRegionName = "",
  defaultLatitude = null,
  defaultLongitude = null,
  regionName,
  onRegionChange,
  onCoordsChange,
  showDetectButton = true,
  className,
}: ObourLocationFieldsProps) {
  const isControlled =
    typeof regionName === "string" && typeof onRegionChange === "function";
  const [internalRegion, setInternalRegion] = useState(defaultRegionName);
  const [districts, setDistricts] = useState<string[]>([...OBOUR_DISTRICTS]);
  const [latitude, setLatitude] = useState<number | null>(defaultLatitude);
  const [longitude, setLongitude] = useState<number | null>(defaultLongitude);
  const [detectStatus, setDetectStatus] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);

  const selectedRegion = isControlled ? regionName : internalRegion;

  useEffect(() => {
    if (!isControlled) {
      setInternalRegion(defaultRegionName);
    }
  }, [defaultRegionName, isControlled]);

  useEffect(() => {
    let cancelled = false;

    async function loadDistricts() {
      try {
        const response = await fetch("/api/discovery/districts");
        const result = await response.json();
        const next = (result.districts as Array<{ regionName: string }> | undefined)
          ?.map((item) => item.regionName)
          .filter(Boolean);

        if (!cancelled && next && next.length > 0) {
          setDistricts(next);
        }
      } catch {
        // Keep seeded defaults on failure.
      }
    }

    void loadDistricts();
    return () => {
      cancelled = true;
    };
  }, []);

  function setRegion(next: string) {
    if (isControlled) {
      onRegionChange?.(next);
    } else {
      setInternalRegion(next);
    }
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      setDetectStatus("المتصفح لا يدعم تحديد الموقع.");
      return;
    }

    setDetecting(true);
    setDetectStatus(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLatitude(next.latitude);
        setLongitude(next.longitude);
        onCoordsChange?.(next);
        setDetectStatus("تم تحديد موقعك. اختر الحي يدويًا من القائمة.");
        setDetecting(false);
      },
      () => {
        setDetectStatus("تعذر تحديد الموقع. اختر الحي يدويًا.");
        setDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <div className={className ?? "space-y-4"}>
      <div className="space-y-2">
        <label className="block text-sm font-medium">المدينة</label>
        <input type="hidden" name={cityFieldName} value={OBOUR_CITY_NAME} />
        <div className="w-full rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          {OBOUR_CITY_NAME}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor={regionFieldName} className="block text-sm font-medium">
          الحي / المنطقة
        </label>
        <select
          id={regionFieldName}
          name={regionFieldName}
          required
          value={selectedRegion}
          onChange={(event) => setRegion(event.target.value)}
          className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none"
        >
          <option value="" disabled>
            اختر الحي
          </option>
          {districts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
      </div>

      <input type="hidden" name={latitudeFieldName} value={latitude ?? ""} />
      <input type="hidden" name={longitudeFieldName} value={longitude ?? ""} />

      {showDetectButton ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={detectLocation}
            disabled={detecting}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-zinc-50 disabled:opacity-60"
          >
            {detecting ? "جارٍ تحديد الموقع..." : "تحديد موقعي الحالي"}
          </button>
          {detectStatus ? (
            <p className="text-xs leading-6 text-zinc-600">{detectStatus}</p>
          ) : null}
          {latitude != null && longitude != null ? (
            <p className="text-xs text-emerald-700">
              الإحداثيات: {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
