import { db } from "@/lib/db";
import { serializePolygonRing } from "@/lib/district-polygon";
import { OBOUR_CITY_NAME, OBOUR_DISTRICTS } from "@/lib/obour-areas";
import { OBOUR_DISTRICT_POLYGONS } from "@/lib/obour-geofence";

type DistrictMerge = {
  merged: string;
  legacy: readonly string[];
};

const DISTRICT_MERGES: readonly DistrictMerge[] = [
  {
    merged: "إسكان الشباب / المستقبل",
    legacy: ["إسكان الشباب", "إسكان المستقبل"],
  },
  {
    merged: "الحرية / المجد",
    legacy: ["الحرية", "حي المجد", "الحرية / حي المجد"],
  },
  {
    merged: "الإسكان العائلي / القومي",
    legacy: ["الإسكان العائلي", "الإسكان القومي"],
  },
  {
    merged: "الكرامة / سكن مصر",
    legacy: ["سكن مصر (العبور الجديدة)", "حي الكرامة"],
  },
];

function normalizeRegionNameForAssert(regionName: string): string {
  const trimmed = regionName.trim();
  for (const { merged, legacy } of DISTRICT_MERGES) {
    if (trimmed === merged || legacy.includes(trimmed)) {
      return merged;
    }
  }
  return trimmed;
}

async function mergeLegacyDistrict({ merged, legacy }: DistrictMerge) {
  const target = await db.region.upsert({
    where: {
      cityName_regionName: {
        cityName: OBOUR_CITY_NAME,
        regionName: merged,
      },
    },
    create: {
      cityName: OBOUR_CITY_NAME,
      regionName: merged,
      isActive: true,
    },
    update: {
      isActive: true,
    },
  });

  for (const legacyName of legacy) {
    const oldRegion = await db.region.findUnique({
      where: {
        cityName_regionName: {
          cityName: OBOUR_CITY_NAME,
          regionName: legacyName,
        },
      },
      select: { id: true },
    });

    if (!oldRegion || oldRegion.id === target.id) {
      continue;
    }

    await db.kitchen.updateMany({
      where: { regionId: oldRegion.id },
      data: { regionId: target.id },
    });
    await db.customerAddress.updateMany({
      where: { regionId: oldRegion.id },
      data: { regionId: target.id },
    });
    await db.order.updateMany({
      where: { regionId: oldRegion.id },
      data: { regionId: target.id },
    });
    await db.region.update({
      where: { id: oldRegion.id },
      data: { isActive: false },
    });
  }
}

export async function ensureDefaultObourDistricts() {
  // Always upsert defaults so newly added catalog names appear on existing DBs.
  await db.region.createMany({
    data: OBOUR_DISTRICTS.map((regionName) => ({
      cityName: OBOUR_CITY_NAME,
      regionName,
      isActive: true,
    })),
    skipDuplicates: true,
  });

  for (const merge of DISTRICT_MERGES) {
    await mergeLegacyDistrict(merge);
  }

  // Seed hardcoded polygons only when a district still has no ring (don't overwrite admin edits).
  for (const polygon of OBOUR_DISTRICT_POLYGONS) {
    const ringJson = serializePolygonRing(
      polygon.ring.map(([lng, lat]) => [lng, lat]),
    );
    if (!ringJson) {
      continue;
    }
    await db.region.updateMany({
      where: {
        cityName: OBOUR_CITY_NAME,
        regionName: polygon.name,
        polygonRingJson: null,
      },
      data: { polygonRingJson: ringJson },
    });
  }
}

export async function listActiveObourDistricts() {
  await ensureDefaultObourDistricts();

  return db.region.findMany({
    where: {
      cityName: OBOUR_CITY_NAME,
      isActive: true,
    },
    orderBy: [{ regionName: "asc" }],
  });
}

export async function listAllObourDistricts() {
  await ensureDefaultObourDistricts();

  return db.region.findMany({
    where: {
      cityName: OBOUR_CITY_NAME,
    },
    orderBy: [{ regionName: "asc" }],
    include: {
      _count: {
        select: {
          kitchens: true,
          customerAddresses: true,
        },
      },
    },
  });
}

export async function assertObourLocation(
  cityName: string,
  regionName: string,
): Promise<string | null> {
  if (cityName.trim() !== OBOUR_CITY_NAME) {
    return `المدينة يجب أن تكون ${OBOUR_CITY_NAME}.`;
  }

  const trimmed = normalizeRegionNameForAssert(regionName);
  if (!trimmed) {
    return "اختر حيًا من أحياء مدينة العبور.";
  }

  await ensureDefaultObourDistricts();

  const region = await db.region.findUnique({
    where: {
      cityName_regionName: {
        cityName: OBOUR_CITY_NAME,
        regionName: trimmed,
      },
    },
    select: { isActive: true },
  });

  if (!region || !region.isActive) {
    return "اختر حيًا من أحياء مدينة العبور.";
  }

  return null;
}
