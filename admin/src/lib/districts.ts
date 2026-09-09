import { db } from "@/lib/db";
import { OBOUR_CITY_NAME, OBOUR_DISTRICTS } from "@/lib/obour-areas";

export async function ensureDefaultObourDistricts() {
  const existing = await db.region.count({
    where: { cityName: OBOUR_CITY_NAME },
  });

  if (existing > 0) {
    return;
  }

  await db.region.createMany({
    data: OBOUR_DISTRICTS.map((regionName) => ({
      cityName: OBOUR_CITY_NAME,
      regionName,
      isActive: true,
    })),
    skipDuplicates: true,
  });
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

  const trimmed = regionName.trim();
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
