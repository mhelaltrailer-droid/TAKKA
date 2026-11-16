import {
  ApprovalStatus,
  AvailabilityStatus,
  OrderReadiness,
  Prisma,
  PrismaClient,
  UserRole,
} from "@prisma/client";

import {
  buildDemoPlans,
  describeDatabaseTarget,
  type DemoKitchenPlan,
  type DemoMenuPlan,
} from "./demo-data";
import { districtSortOrder } from "./district-order";
import { OBOUR_CITY_NAME, OBOUR_DISTRICTS } from "./obour-areas";

/**
 * Prisma writes only. Placeholder owners have no email, no phone, no Clerk id,
 * and isActive is false, so seeding cannot send mail, push, or realtime alerts.
 */

const REVIEWED_AT = new Date("2026-02-01T08:00:00.000Z");

type SeedSkip = { regionName: string; reason: string };

export type SeedReport = {
  target: string;
  districtsInserted: number;
  created: number;
  updated: number;
  items: number;
  skipped: SeedSkip[];
};

export type RemoveReport = {
  target: string;
  kitchens: number;
  orders: number;
  users: number;
  blocked: { kitchenName: string; reason: string }[];
};

const ownerSelect = {
  id: true,
  isDemo: true,
  clerkUserId: true,
  fullName: true,
} satisfies Prisma.UserSelect;

type DemoKitchenRow = Prisma.KitchenGetPayload<{
  include: {
    owner: { select: typeof ownerSelect };
    menuItems: { select: { isDemo: true } };
  };
}>;

export async function seedDemoMarketplace(prisma: PrismaClient): Promise<SeedReport> {
  const target = describeDatabaseTarget(process.env.DATABASE_URL);
  console.log(`Demo seed target: ${target}`);
  await assertDemoColumns(prisma);

  const inserted = await prisma.region.createMany({
    data: OBOUR_DISTRICTS.map((regionName) => ({
      cityName: OBOUR_CITY_NAME,
      regionName,
      isActive: true,
      sortOrder: districtSortOrder(regionName),
    })),
    skipDuplicates: true,
  });

  const regions = await prisma.region.findMany({
    select: {
      id: true,
      regionName: true,
      cityName: true,
      isActive: true,
      sortOrder: true,
      polygonRingJson: true,
    },
  });
  const { plans, skipped: catalogSkips } = buildDemoPlans(regions);
  const skipped: SeedSkip[] = catalogSkips.map((skip) => ({
    regionName: skip.regionName,
    reason: skip.reason,
  }));

  let created = 0;
  let updated = 0;
  let items = 0;

  for (const plan of plans) {
    const outcome = await prisma.$transaction(
      (tx) => upsertDemoKitchen(tx, plan),
      { timeout: 20_000, maxWait: 10_000 },
    );
    if (outcome.action === "skipped") {
      skipped.push({ regionName: plan.regionName, reason: outcome.reason });
      continue;
    }
    if (outcome.action === "created") created += 1;
    if (outcome.action === "updated") updated += 1;
    items += outcome.items;
  }

  const orphans = await sweepOrphanDemoUsers(prisma);
  if (orphans > 0) {
    console.log(`Removed ${orphans} placeholder owner(s) with no kitchen.`);
  }

  const report: SeedReport = {
    target,
    districtsInserted: inserted.count,
    created,
    updated,
    items,
    skipped,
  };
  console.log(
    `Demo seed done. created=${created} updated=${updated} skipped=${skipped.length} items=${items} districtsInserted=${inserted.count}`,
  );
  return report;
}

export async function removeDemoMarketplace(prisma: PrismaClient): Promise<RemoveReport> {
  const target = describeDatabaseTarget(process.env.DATABASE_URL);
  console.log(`Demo remove target: ${target}`);
  await assertDemoColumns(prisma);

  const kitchens = await prisma.kitchen.findMany({
    where: { isDemo: true },
    include: {
      owner: { select: ownerSelect },
      menuItems: { select: { isDemo: true } },
    },
  });

  const blocked: RemoveReport["blocked"] = [];
  const safeIds: string[] = [];
  for (const kitchen of kitchens) {
    const reason = blockReason(kitchen);
    if (reason) {
      blocked.push({ kitchenName: kitchen.kitchenName, reason });
      continue;
    }
    safeIds.push(kitchen.id);
  }

  const deleted = await deleteDemoKitchens(prisma, safeIds);
  const orphans = await sweepOrphanDemoUsers(prisma);
  const report: RemoveReport = {
    target,
    kitchens: deleted.kitchens,
    orders: deleted.orders,
    users: deleted.users + orphans,
    blocked,
  };
  console.log(
    `Demo remove done. kitchens=${report.kitchens} orders=${report.orders} users=${report.users} blocked=${blocked.length}`,
  );
  for (const row of blocked) {
    console.log(`Left in place: ${row.kitchenName} (${row.reason})`);
  }
  return report;
}

async function upsertDemoKitchen(
  tx: Prisma.TransactionClient,
  plan: DemoKitchenPlan,
): Promise<
  | { action: "created" | "updated"; items: number }
  | { action: "skipped"; reason: string }
> {
  const existing = await tx.kitchen.findMany({
    where: { isDemo: true, regionId: plan.regionId },
    orderBy: { createdAt: "asc" },
    include: {
      owner: { select: ownerSelect },
      menuItems: { select: { isDemo: true } },
    },
  });
  const primary = existing[0];
  const extras = existing.slice(1).filter((kitchen) => !blockReason(kitchen));
  if (extras.length) {
    await deleteDemoKitchensInTx(
      tx,
      extras.map((kitchen) => kitchen.id),
    );
  }

  if (primary) {
    const reason = blockReason(primary);
    if (reason) return { action: "skipped", reason };
    await tx.user.update({
      where: { id: primary.ownerUserId },
      data: {
        role: UserRole.KITCHEN_OWNER,
        isDemo: true,
        isActive: false,
        clerkUserId: null,
        email: null,
        phoneNumber: null,
        passwordHash: null,
      },
    });
    await tx.kitchen.update({
      where: { id: primary.id },
      data: {
        ...kitchenData(plan, primary.slug, primary.reviewedAt),
        kitchenName: primary.kitchenName,
        phoneNumber: primary.phoneNumber,
      },
    });
    const itemCount = await syncMenuItems(tx, primary.id, plan.items);
    await replaceGallery(tx, primary.id, plan.galleryUrls);
    return { action: "updated", items: itemCount };
  }

  const owner = await tx.user.create({
    data: {
      role: UserRole.KITCHEN_OWNER,
      fullName: plan.ownerName,
      email: null,
      phoneNumber: null,
      clerkUserId: null,
      passwordHash: null,
      isActive: false,
      isDemo: true,
    },
  });
  const slug = await uniqueSlug(tx, plan.slug);
  const kitchen = await tx.kitchen.create({
    data: {
      ownerUserId: owner.id,
      ...kitchenData(plan, slug, null),
    },
  });
  const itemCount = await syncMenuItems(tx, kitchen.id, plan.items);
  await replaceGallery(tx, kitchen.id, plan.galleryUrls);
  return { action: "created", items: itemCount };
}

function kitchenData(plan: DemoKitchenPlan, slug: string, reviewedAt: Date | null) {
  return {
    kitchenName: plan.kitchenName,
    slug,
    description: plan.description,
    logoUrl: plan.logoUrl,
    coverImageUrl: plan.coverImageUrl,
    phoneNumber: plan.phoneNumber,
    cityName: plan.cityName,
    regionId: plan.regionId,
    addressLine: plan.addressLine,
    latitude: plan.latitude,
    longitude: plan.longitude,
    approvalStatus: ApprovalStatus.APPROVED,
    availabilityStatus: AvailabilityStatus.OPEN,
    rejectionReason: null,
    reviewedAt: reviewedAt ?? REVIEWED_AT,
    isDemo: true,
  };
}

async function syncMenuItems(
  tx: Prisma.TransactionClient,
  kitchenId: string,
  items: readonly DemoMenuPlan[],
): Promise<number> {
  const existing = await tx.menuItem.findMany({
    where: { kitchenId, isDemo: true },
  });
  const keep = new Set<string>();
  for (const item of items) {
    const data: Prisma.MenuItemUncheckedUpdateInput = {
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      categoryId: item.categoryId,
      basePrice: item.basePrice,
      discountedPrice: item.discountedPrice,
      depositAmount: item.depositAmount,
      orderReadiness: item.orderReadiness as OrderReadiness,
      isAvailable: true,
      sortOrder: item.sortOrder,
      isDishOfTheDay: item.isDishOfTheDay,
      dishOfTheDayPrice: item.dishOfTheDayPrice,
      dishOfTheDayQty: item.dishOfTheDayQty,
      approvalStatus: ApprovalStatus.APPROVED,
      rejectionReason: null,
      isDemo: true,
    };
    const match = existing.find((row) => row.sortOrder === item.sortOrder);
    const saved = match
      ? await tx.menuItem.update({ where: { id: match.id }, data })
      : await tx.menuItem.create({
          data: { ...(data as Prisma.MenuItemUncheckedCreateInput), kitchenId },
        });
    keep.add(saved.id);
    const sizeInUse = await tx.orderItem.count({
      where: { menuItemId: saved.id, menuItemSizeId: { not: null } },
    });
    if (sizeInUse === 0) {
      await tx.menuItemSize.deleteMany({ where: { menuItemId: saved.id } });
      if (item.sizes.length) {
        await tx.menuItemSize.createMany({
          data: item.sizes.map((size) => ({
            menuItemId: saved.id,
            sizeName: size.sizeName,
            price: size.price,
            depositAmount: size.depositAmount,
            isActive: true,
          })),
        });
      }
    }
  }

  for (const extra of existing) {
    if (keep.has(extra.id)) continue;
    const used = await tx.orderItem.count({ where: { menuItemId: extra.id } });
    if (used > 0) continue;
    await tx.flashOffer.deleteMany({ where: { menuItemId: extra.id } });
    await tx.menuItemSize.deleteMany({ where: { menuItemId: extra.id } });
    await tx.menuItem.delete({ where: { id: extra.id } });
  }
  return items.length;
}

async function replaceGallery(
  tx: Prisma.TransactionClient,
  kitchenId: string,
  galleryUrls: readonly string[],
) {
  await tx.kitchenGalleryImage.deleteMany({ where: { kitchenId } });
  if (!galleryUrls.length) return;
  await tx.kitchenGalleryImage.createMany({
    data: galleryUrls.map((imageUrl, sortOrder) => ({
      kitchenId,
      imageUrl,
      sortOrder,
    })),
  });
}

async function uniqueSlug(
  tx: Prisma.TransactionClient,
  desired: string,
  selfId?: string,
): Promise<string> {
  let candidate = desired;
  for (let n = 2; n < 40; n += 1) {
    const hit = await tx.kitchen.findFirst({
      where: {
        slug: candidate,
        ...(selfId ? { NOT: { id: selfId } } : {}),
      },
      select: { id: true },
    });
    if (!hit) return candidate;
    candidate = `${desired}-${n}`;
  }
  throw new Error(`Slug already used: ${desired}`);
}

function blockReason(kitchen: DemoKitchenRow): string | null {
  if (!kitchen.isDemo) return "not a demo kitchen";
  if (!kitchen.owner?.isDemo || kitchen.owner.clerkUserId) {
    return "owner is not a placeholder";
  }
  if (kitchen.menuItems.some((item) => !item.isDemo)) {
    return "kitchen has a non-demo menu item";
  }
  return null;
}

async function deleteDemoKitchens(
  prisma: PrismaClient,
  kitchenIds: string[],
): Promise<{ kitchens: number; orders: number; users: number }> {
  if (!kitchenIds.length) return { kitchens: 0, orders: 0, users: 0 };
  return prisma.$transaction(
    (tx) => deleteDemoKitchensInTx(tx, kitchenIds),
    { timeout: 60_000, maxWait: 10_000 },
  );
}

async function deleteDemoKitchensInTx(
  tx: Prisma.TransactionClient,
  kitchenIds: string[],
): Promise<{ kitchens: number; orders: number; users: number }> {
  const kitchens = await tx.kitchen.findMany({
    where: { id: { in: kitchenIds }, isDemo: true },
    include: {
      owner: { select: ownerSelect },
      menuItems: { select: { isDemo: true } },
    },
  });
  const safe = kitchens.filter((kitchen) => !blockReason(kitchen));
  const ids = safe.map((kitchen) => kitchen.id);
  if (!ids.length) return { kitchens: 0, orders: 0, users: 0 };

  const orders = await tx.order.findMany({
    where: { kitchenId: { in: ids } },
    select: { id: true },
  });
  const orderIds = orders.map((order) => order.id);
  if (orderIds.length) {
    await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.depositProof.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.orderMessage.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.review.deleteMany({
      where: { OR: [{ orderId: { in: orderIds } }, { kitchenId: { in: ids } }] },
    });
    await tx.notification.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.order.deleteMany({ where: { id: { in: orderIds } } });
  } else {
    await tx.review.deleteMany({ where: { kitchenId: { in: ids } } });
  }

  await tx.flashOffer.deleteMany({ where: { kitchenId: { in: ids } } });
  await tx.menuItemSize.deleteMany({
    where: { menuItem: { kitchenId: { in: ids }, isDemo: true } },
  });
  await tx.menuItem.deleteMany({ where: { kitchenId: { in: ids }, isDemo: true } });
  await tx.kitchenDocument.deleteMany({ where: { kitchenId: { in: ids } } });
  await tx.kitchenGalleryImage.deleteMany({ where: { kitchenId: { in: ids } } });
  await tx.kitchenPaymentMethod.deleteMany({ where: { kitchenId: { in: ids } } });
  await tx.kitchenViewEvent.deleteMany({ where: { kitchenId: { in: ids } } });
  const deleted = await tx.kitchen.deleteMany({
    where: { id: { in: ids }, isDemo: true },
  });

  let users = 0;
  for (const kitchen of safe) {
    if (await deletePlaceholderUser(tx, kitchen.owner.id)) users += 1;
  }
  return { kitchens: deleted.count, orders: orderIds.length, users };
}

async function sweepOrphanDemoUsers(prisma: PrismaClient): Promise<number> {
  const orphans = await prisma.user.findMany({
    where: { isDemo: true, clerkUserId: null, kitchens: { none: {} } },
    select: { id: true },
  });
  let removed = 0;
  for (const orphan of orphans) {
    const did = await prisma.$transaction((tx) => deletePlaceholderUser(tx, orphan.id));
    if (did) removed += 1;
  }
  return removed;
}

async function deletePlaceholderUser(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<boolean> {
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user?.isDemo || user.clerkUserId) return false;
  const [kitchens, orders, addresses, reviews, messages, deposits, adminActions] =
    await Promise.all([
      tx.kitchen.count({ where: { ownerUserId: userId } }),
      tx.order.count({ where: { customerId: userId } }),
      tx.customerAddress.count({ where: { customerId: userId } }),
      tx.review.count({ where: { customerId: userId } }),
      tx.orderMessage.count({ where: { senderUserId: userId } }),
      tx.depositProof.count({
        where: { OR: [{ uploadedByUserId: userId }, { reviewedByUserId: userId }] },
      }),
      tx.adminAction.count({ where: { adminUserId: userId } }),
    ]);
  if (
    kitchens + orders + addresses + reviews + messages + deposits + adminActions >
    0
  ) {
    return false;
  }
  await tx.kitchenViewEvent.deleteMany({ where: { viewerUserId: userId } });
  await tx.notification.deleteMany({ where: { userId } });
  await tx.devicePushToken.deleteMany({ where: { userId } });
  await tx.user.delete({ where: { id: userId } });
  return true;
}

async function assertDemoColumns(prisma: PrismaClient) {
  const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'isDemo'
      AND lower(table_name) IN ('kitchen', 'menuitem', 'user')
  `;
  const found = new Set(rows.map((row) => row.table_name.toLowerCase()));
  const missing = ["kitchen", "menuitem", "user"].filter((name) => !found.has(name));
  if (missing.length) {
    throw new Error(
      `Missing isDemo on ${missing.join(", ")}. Deploy the app so prisma db push runs, or run: npx prisma migrate deploy`,
    );
  }
}
