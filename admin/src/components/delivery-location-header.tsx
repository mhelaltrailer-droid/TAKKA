"use client";

import { useEffect, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { OBOUR_CITY_NAME, OBOUR_DISTRICTS } from "@/lib/obour-areas";
import { detectObourDistrict } from "@/lib/obour-geofence";
import {
  ensureDistrictPolygonsLoaded,
  getRuntimeCityRing,
  getRuntimeDistrictPolygons,
} from "@/lib/obour-geofence-runtime";

const SELECTED_KEY = "takka.selectedObourDistrict";
const CURRENT_KEY = "takka.currentObourDistrict";
const MODE_KEY = "takka.deliveryLocationMode";
const GPS_TIMEOUT_MS = 10000;

type LocationMode = "current" | "other";

type SavedLocation = {
  selected: string;
  current: string;
  mode: LocationMode;
};

type DeliveryLocationHeaderProps = {
  onDistrictChange?: (district: string) => void;
};

function readSavedLocation(): SavedLocation {
  const selected = window.localStorage.getItem(SELECTED_KEY) ?? "";
  const current = window.localStorage.getItem(CURRENT_KEY) ?? "";
  const modeRaw = window.localStorage.getItem(MODE_KEY);
  return {
    selected,
    current: current || selected,
    mode: modeRaw === "other" ? "other" : "current",
  };
}

function detectDistrictName(knownDistricts: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const detected = detectObourDistrict(
          position.coords.latitude,
          position.coords.longitude,
          getRuntimeDistrictPolygons(),
          getRuntimeCityRing(),
        );

        if (detected.status !== "district") {
          resolve(null);
          return;
        }

        const name = detected.districtName;
        const known =
          knownDistricts.includes(name) ||
          (OBOUR_DISTRICTS as readonly string[]).includes(name);
        resolve(known ? name : null);
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: 0 },
    );
  });
}

export function DeliveryLocationHeader({
  onDistrictChange,
}: DeliveryLocationHeaderProps) {
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [currentDistrict, setCurrentDistrict] = useState("");
  const [mode, setMode] = useState<LocationMode>("current");
  const [open, setOpen] = useState(false);
  const [pickingOther, setPickingOther] = useState(false);
  const [pickingCurrent, setPickingCurrent] = useState(false);
  const [districts, setDistricts] = useState<string[]>([...OBOUR_DISTRICTS]);
  const [loadingDistricts, setLoadingDistricts] = useState(true);
  const [resolvingLocation, setResolvingLocation] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [detectStatus, setDetectStatus] = useState<string | null>(null);
  const savedRef = useRef<SavedLocation | null>(null);
  const didResolveRef = useRef(false);
  const onDistrictChangeRef = useRef(onDistrictChange);
  onDistrictChangeRef.current = onDistrictChange;

  useEffect(() => {
    savedRef.current = readSavedLocation();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDistricts() {
      try {
        await ensureDistrictPolygonsLoaded();
        const response = await fetch("/api/discovery/districts");
        const result = await response.json();
        const next = (
          result.districts as Array<{ regionName: string }> | undefined
        )
          ?.map((item) => item.regionName)
          .filter(Boolean);

        if (!cancelled && next && next.length > 0) {
          setDistricts(next);
        }
      } catch {
        // Keep defaults.
      } finally {
        if (!cancelled) {
          setLoadingDistricts(false);
        }
      }
    }

    void loadDistricts();
    return () => {
      cancelled = true;
    };
  }, []);

  // Districts ready → GPS first → fallback to saved → «اختر الحي» (once per mount).
  useEffect(() => {
    if (loadingDistricts || didResolveRef.current) {
      return;
    }
    didResolveRef.current = true;

    let cancelled = false;

    async function resolveLocation() {
      setResolvingLocation(true);
      const known = districts.length > 0 ? districts : [...OBOUR_DISTRICTS];
      const detected = await detectDistrictName(known);

      if (cancelled) {
        return;
      }

      if (detected) {
        setSelectedDistrict(detected);
        setCurrentDistrict(detected);
        setMode("current");
        window.localStorage.setItem(SELECTED_KEY, detected);
        window.localStorage.setItem(CURRENT_KEY, detected);
        window.localStorage.setItem(MODE_KEY, "current");
        onDistrictChangeRef.current?.(detected);
        setResolvingLocation(false);
        return;
      }

      const saved = savedRef.current ?? readSavedLocation();
      if (saved.selected) {
        setSelectedDistrict(saved.selected);
        setCurrentDistrict(saved.current || saved.selected);
        setMode(saved.mode);
        onDistrictChangeRef.current?.(saved.selected);
      } else {
        setSelectedDistrict("");
        setCurrentDistrict("");
        setMode("current");
        onDistrictChangeRef.current?.("");
      }
      setResolvingLocation(false);
    }

    void resolveLocation();
    return () => {
      cancelled = true;
    };
  }, [loadingDistricts, districts]);

  function persist(
    selected: string,
    current: string,
    nextMode: LocationMode,
  ) {
    setSelectedDistrict(selected);
    setCurrentDistrict(current);
    setMode(nextMode);
    setResolvingLocation(false);
    window.localStorage.setItem(SELECTED_KEY, selected);
    window.localStorage.setItem(CURRENT_KEY, current);
    window.localStorage.setItem(MODE_KEY, nextMode);
    onDistrictChangeRef.current?.(selected);
    setOpen(false);
    setPickingOther(false);
    setPickingCurrent(false);
  }

  function openSheet() {
    if (resolvingLocation) {
      return;
    }
    setPickingOther(false);
    setPickingCurrent(false);
    setDetectStatus(null);
    if (mode === "other" && !selectedDistrict) {
      setPickingOther(true);
    }
    if (mode === "current" && !currentDistrict) {
      setPickingCurrent(true);
    }
    setOpen(true);
  }

  function selectCurrent() {
    if (!currentDistrict) {
      setMode("current");
      setPickingCurrent(true);
      setPickingOther(false);
      return;
    }
    persist(currentDistrict, currentDistrict, "current");
  }

  function openOtherPicker() {
    setMode("other");
    setPickingOther(true);
    setPickingCurrent(false);
    setDetectStatus(null);
  }

  function pickDistrict(district: string) {
    if (pickingCurrent) {
      persist(district, district, "current");
      return;
    }
    persist(district, currentDistrict, "other");
  }

  function detectMyLocation() {
    if (!navigator.geolocation) {
      setDetectStatus("المتصفح لا يدعم تحديد الموقع.");
      return;
    }

    setDetecting(true);
    setDetectStatus(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const detected = detectObourDistrict(
          position.coords.latitude,
          position.coords.longitude,
          getRuntimeDistrictPolygons(),
          getRuntimeCityRing(),
        );

        if (detected.status === "district") {
          const name = detected.districtName;
          if (districts.includes(name)) {
            persist(name, name, "current");
            setDetectStatus(`تم تحديد الحي: ${name}`);
          } else {
            setPickingCurrent(true);
            setPickingOther(false);
            setDetectStatus(
              `تم تحديد موقعك بالقرب من «${name}». اختر الحي يدويًا.`,
            );
          }
        } else if (detected.status === "city_only") {
          setPickingCurrent(true);
          setPickingOther(false);
          setDetectStatus(
            "أنت داخل مدينة العبور، لكن الحي غير واضح. اختر الحي يدويًا.",
          );
        } else {
          setPickingCurrent(true);
          setPickingOther(false);
          setDetectStatus(
            "يبدو أنك خارج نطاق مدينة العبور. اختر الحي يدويًا إن كان التوصيل داخل العبور.",
          );
        }
        setDetecting(false);
      },
      () => {
        setDetectStatus("تعذر تحديد الموقع. اختر الحي يدويًا.");
        setDetecting(false);
      },
      { enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: 0 },
    );
  }

  const title = resolvingLocation
    ? "جاري تحديد موقعك..."
    : selectedDistrict || "اختر الحي";

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={openSheet}
        disabled={resolvingLocation}
        className="flex w-full flex-col items-start gap-1 text-right disabled:opacity-80"
      >
        <span className="text-xs text-[#6b4a3a]">التوصيل / الاستلام في</span>
        <span className="flex items-center gap-2 text-xl font-bold text-[#3b2418]">
          {resolvingLocation ? (
            <span className="text-[#6b4a3a]">{title}</span>
          ) : (
            title
          )}
          <span aria-hidden className="text-sm text-[#6b4a3a]">
            {resolvingLocation ? "…" : "▼"}
          </span>
        </span>
        <span className="text-sm text-[#6b4a3a]">{OBOUR_CITY_NAME}</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="إغلاق"
            className="absolute inset-0"
            onClick={() => {
              setOpen(false);
              setPickingOther(false);
              setPickingCurrent(false);
              setDetectStatus(null);
            }}
          />
          <div className="relative z-10 w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl">
            <div className="mb-4 flex items-center">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setPickingOther(false);
                  setPickingCurrent(false);
                  setDetectStatus(null);
                }}
                className="rounded-full px-2 py-1 text-sm text-[#6b4a3a]"
              >
                إغلاق
              </button>
              <h3 className="flex-1 text-center text-lg font-bold">
                اختر موقع التوصيل
              </h3>
              <span className="w-12" />
            </div>

            {!pickingOther && !pickingCurrent ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={selectCurrent}
                  className="flex w-full items-start gap-3 rounded-2xl border border-[#ead9c8] bg-[#fff8f1] px-4 py-3 text-right"
                >
                  <span className="mt-0.5 text-lg" aria-hidden>
                    📍
                  </span>
                  <span>
                    <span className="block font-semibold text-[#3b2418]">
                      موقعي الحالي
                    </span>
                    <span className="mt-1 block text-sm text-[#6b4a3a]">
                      {currentDistrict || "حدّد موقعك أو اختر الحي"}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={openOtherPicker}
                  className="flex w-full items-start gap-3 rounded-2xl border border-[#ead9c8] px-4 py-3 text-right"
                >
                  <span className="mt-0.5 text-lg" aria-hidden>
                    🏠
                  </span>
                  <span>
                    <span className="block font-semibold text-[#3b2418]">
                      توصيل لحي آخر
                    </span>
                    <span className="mt-1 block text-sm text-[#6b4a3a]">
                      اختر حيًا داخل مدينة العبور
                    </span>
                  </span>
                </button>

                <DetectButton
                  detecting={detecting}
                  detectStatus={detectStatus}
                  onClick={detectMyLocation}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[#6b4a3a]">
                  {pickingCurrent
                    ? "اختر حي موقعك الحالي"
                    : "اختر حي التوصيل"}
                </p>
                {loadingDistricts ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </div>
                ) : (
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {districts.map((district) => (
                      <button
                        key={district}
                        type="button"
                        onClick={() => pickDistrict(district)}
                        className={`flex w-full rounded-xl border px-4 py-3 text-right text-sm font-medium ${
                          selectedDistrict === district
                            ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-secondary)]"
                            : "border-[#ead9c8] text-[#3b2418]"
                        }`}
                      >
                        {district}
                      </button>
                    ))}
                  </div>
                )}
                <DetectButton
                  detecting={detecting}
                  detectStatus={detectStatus}
                  onClick={detectMyLocation}
                />
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetectButton({
  detecting,
  detectStatus,
  onClick,
}: {
  detecting: boolean;
  detectStatus: string | null;
  onClick: () => void;
}) {
  return (
    <div className="space-y-2 pt-1">
      <button
        type="button"
        disabled={detecting}
        onClick={onClick}
        className="w-full rounded-2xl border border-[#ead9c8] bg-white px-4 py-3 text-sm font-semibold text-[#4a2e22] transition hover:border-[var(--brand-primary)] disabled:opacity-60"
      >
        {detecting ? "جارٍ تحديد موقعك..." : "تحديد موقعي الحالي (GPS)"}
      </button>
      {detectStatus ? (
        <p className="text-xs leading-6 text-[#6b4a3a]">{detectStatus}</p>
      ) : null}
    </div>
  );
}
