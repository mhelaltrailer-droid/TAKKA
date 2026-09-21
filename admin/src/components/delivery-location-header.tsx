"use client";

import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { OBOUR_CITY_NAME, OBOUR_DISTRICTS } from "@/lib/obour-areas";
import { detectObourDistrict } from "@/lib/obour-geofence";

const SELECTED_KEY = "takka.selectedObourDistrict";
const CURRENT_KEY = "takka.currentObourDistrict";
const MODE_KEY = "takka.deliveryLocationMode";

type LocationMode = "current" | "other";

type DeliveryLocationHeaderProps = {
  onDistrictChange?: (district: string) => void;
};

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
  const [detecting, setDetecting] = useState(false);
  const [detectStatus, setDetectStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const selected = window.localStorage.getItem(SELECTED_KEY) ?? "";
    const current = window.localStorage.getItem(CURRENT_KEY) ?? "";
    const modeRaw = window.localStorage.getItem(MODE_KEY);
    const nextMode: LocationMode = modeRaw === "other" ? "other" : "current";

    setSelectedDistrict(selected);
    setCurrentDistrict(current || selected);
    setMode(nextMode);
    if (selected) {
      onDistrictChange?.(selected);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDistricts() {
      try {
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

  // Every home open: try GPS. Success → set district. Fail → keep last saved / «اختر الحي».
  useEffect(() => {
    if (!hydrated || loadingDistricts) {
      return;
    }
    if (!navigator.geolocation) {
      return;
    }

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;

        const detected = detectObourDistrict(
          position.coords.latitude,
          position.coords.longitude,
        );

        if (detected.status !== "district") {
          return;
        }

        const name = detected.districtName;
        const known =
          districts.includes(name) ||
          (OBOUR_DISTRICTS as readonly string[]).includes(name);
        if (!known) {
          return;
        }

        setSelectedDistrict(name);
        setCurrentDistrict(name);
        setMode("current");
        window.localStorage.setItem(SELECTED_KEY, name);
        window.localStorage.setItem(CURRENT_KEY, name);
        window.localStorage.setItem(MODE_KEY, "current");
        onDistrictChange?.(name);
      },
      () => {
        // Permission denied / unavailable — keep last saved district.
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, loadingDistricts]);

  function persist(
    selected: string,
    current: string,
    nextMode: LocationMode,
  ) {
    setSelectedDistrict(selected);
    setCurrentDistrict(current);
    setMode(nextMode);
    window.localStorage.setItem(SELECTED_KEY, selected);
    window.localStorage.setItem(CURRENT_KEY, current);
    window.localStorage.setItem(MODE_KEY, nextMode);
    onDistrictChange?.(selected);
    setOpen(false);
    setPickingOther(false);
    setPickingCurrent(false);
  }

  function openSheet() {
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
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={openSheet}
        className="flex w-full flex-col items-start gap-1 text-right"
      >
        <span className="text-xs text-[#6b4a3a]">التوصيل / الاستلام في</span>
        <span className="flex items-center gap-2 text-xl font-bold text-[#3b2418]">
          {selectedDistrict || "اختر الحي"}
          <span aria-hidden className="text-sm text-[#6b4a3a]">
            ▼
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
                className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-[#3b2418]"
                aria-label="إغلاق"
              >
                ×
              </button>
              <h2 className="flex-1 text-center text-lg font-bold text-[#3b2418]">
                التوصيل / الاستلام في
              </h2>
              <span className="w-10" />
            </div>

            {pickingOther || pickingCurrent ? (
              <div className="space-y-3">
                <p className="font-bold text-[#3b2418]">
                  {pickingCurrent
                    ? "حدّد حيّك الحالي"
                    : "اختر حيًا آخر للتوصيل / الاستلام"}
                </p>
                {pickingCurrent ? (
                  <DetectLocationButton
                    detecting={detecting}
                    detectStatus={detectStatus}
                    onClick={detectMyLocation}
                  />
                ) : null}
                {loadingDistricts ? (
                  <div className="space-y-2 py-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-2xl" />
                    ))}
                  </div>
                ) : (
                  <div className="max-h-[45vh] space-y-2 overflow-y-auto">
                    {districts.map((district) => {
                      const selected = pickingCurrent
                        ? district === currentDistrict
                        : district === selectedDistrict && mode === "other";
                      return (
                        <button
                          key={district}
                          type="button"
                          onClick={() => pickDistrict(district)}
                          className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-right font-semibold transition ${
                            selected
                              ? "border-[#e67e22] border-2 text-[#3b2418]"
                              : "border-[#ead9c8] text-[#3b2418]"
                          }`}
                        >
                          <span>{district}</span>
                          {selected ? (
                            <span className="text-[#e67e22]">✓</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPickingOther(false);
                    setPickingCurrent(false);
                    setDetectStatus(null);
                  }}
                  className="w-full py-2 text-sm font-medium text-[#6b4a3a]"
                >
                  رجوع
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <DetectLocationButton
                  detecting={detecting}
                  detectStatus={detectStatus}
                  onClick={detectMyLocation}
                />
                <LocationOptionCard
                  title="التوصيل إلى موقع آخر"
                  subtitle="اختر حيًا آخر من مدينة العبور"
                  selected={mode === "other"}
                  onClick={openOtherPicker}
                  leading="📍"
                  trailing="‹"
                />
                <LocationOptionCard
                  title="التوصيل إلى الموقع الحالي"
                  subtitle={
                    currentDistrict
                      ? `${currentDistrict}، ${OBOUR_CITY_NAME}`
                      : "حدّد حيّك الحالي في مدينة العبور"
                  }
                  selected={mode === "current" && Boolean(currentDistrict)}
                  onClick={selectCurrent}
                  leading="◎"
                  trailing="✓"
                />
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetectLocationButton({
  detecting,
  detectStatus,
  onClick,
}: {
  detecting: boolean;
  detectStatus: string | null;
  onClick: () => void;
}) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={detecting}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#e67e22] bg-[#fff8f1] px-4 py-3 text-sm font-bold text-[#3b2418] transition hover:bg-[#fff1e4] disabled:opacity-60"
      >
        {detecting ? "جارٍ تحديد موقعك..." : "تحديد موقعي الحالي (GPS)"}
      </button>
      {detectStatus ? (
        <p className="text-xs leading-6 text-[#6b4a3a]">{detectStatus}</p>
      ) : null}
    </div>
  );
}

function LocationOptionCard({
  title,
  subtitle,
  selected,
  onClick,
  leading,
  trailing,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
  leading: string;
  trailing: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-4 text-right transition ${
        selected ? "border-2 border-[#e67e22]" : "border border-[#ead9c8]"
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#ead9c8] text-lg">
        {leading}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-[#3b2418]">{title}</span>
        <span className="mt-1 block truncate text-sm text-[#6b4a3a]">
          {subtitle}
        </span>
      </span>
      <span
        className={`text-xl ${selected ? "text-[#e67e22]" : "text-[#6b4a3a]"}`}
      >
        {trailing}
      </span>
    </button>
  );
}
