"use server";

import { ApprovalStatus, AvailabilityStatus, PaymentType, UserRole } from "@prisma/client";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertObourLocation } from "@/lib/districts";
import { OBOUR_CITY_NAME } from "@/lib/obour-areas";
import { slugify } from "@/lib/slug";

function getString(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

function getOptionalNumber(formData: FormData, key: string): number | null {
  const raw = getString(formData, key);
  if (!raw) {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export async function saveKitchenOnboarding(formData: FormData) {
  const user = await requireAuth();

  const kitchenName = getString(formData, "kitchenName");
  const description = getString(formData, "description");
  const phoneNumber = getString(formData, "phoneNumber");
  const cityName = getString(formData, "cityName") || OBOUR_CITY_NAME;
  const regionName = getString(formData, "regionName");
  const addressLine = getString(formData, "addressLine");
  const logoUrl = getString(formData, "logoUrl");
  const coverImageUrl = getString(formData, "coverImageUrl");
  const instapayHandle = getString(formData, "instapayHandle");
  const instapayLink = getString(formData, "instapayLink");
  const nationalIdImageUrl = getString(formData, "nationalIdImageUrl");
  const latitude = getOptionalNumber(formData, "latitude");
  const longitude = getOptionalNumber(formData, "longitude");

  if (!kitchenName || !phoneNumber || !cityName || !regionName || !addressLine) {
    throw new Error("يرجى استكمال الحقول الأساسية للمطبخ قبل الحفظ.");
  }

  const locationError = await assertObourLocation(cityName, regionName);
  if (locationError) {
    throw new Error(locationError);
  }

  const region = await db.region.upsert({
    where: {
      cityName_regionName: {
        cityName,
        regionName,
      },
    },
    update: {
      isActive: true,
    },
    create: {
      cityName,
      regionName,
      isActive: true,
    },
  });

  const baseSlug = slugify(kitchenName);
  const uniqueSlug = `${baseSlug || "kitchen"}-${user.appUserId.slice(-6)}`;

  const kitchen = await db.kitchen.upsert({
    where: {
      ownerUserId: user.appUserId,
    },
    update: {
      kitchenName,
      slug: uniqueSlug,
      description: description || null,
      logoUrl: logoUrl || null,
      coverImageUrl: coverImageUrl || null,
      phoneNumber,
      cityName,
      regionId: region.id,
      addressLine,
      latitude,
      longitude,
      approvalStatus: ApprovalStatus.PENDING,
      availabilityStatus: AvailabilityStatus.CLOSED,
    },
    create: {
      ownerUserId: user.appUserId,
      kitchenName,
      slug: uniqueSlug,
      description: description || null,
      logoUrl: logoUrl || null,
      coverImageUrl: coverImageUrl || null,
      phoneNumber,
      cityName,
      regionId: region.id,
      addressLine,
      latitude,
      longitude,
      approvalStatus: ApprovalStatus.PENDING,
      availabilityStatus: AvailabilityStatus.CLOSED,
    },
  });

  await db.user.update({
    where: {
      id: user.appUserId,
    },
    data: {
      role: UserRole.KITCHEN_OWNER,
    },
  });

  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(user.userId, {
    publicMetadata: {
      role: "kitchen_owner",
    },
  });

  await db.kitchenPaymentMethod.upsert({
    where: {
      kitchenId: kitchen.id,
    },
    update: {
      paymentType: PaymentType.INSTAPAY,
      accountNumberOrHandle: instapayHandle || null,
      paymentLink: instapayLink || null,
      isActive: true,
    },
    create: {
      kitchenId: kitchen.id,
      paymentType: PaymentType.INSTAPAY,
      accountNumberOrHandle: instapayHandle || null,
      paymentLink: instapayLink || null,
      isActive: true,
    },
  });

  if (nationalIdImageUrl) {
    const existingDocument = await db.kitchenDocument.findFirst({
      where: {
        kitchenId: kitchen.id,
        documentType: "national_id",
      },
      select: {
        id: true,
      },
    });

    if (existingDocument) {
      await db.kitchenDocument.update({
        where: {
          id: existingDocument.id,
        },
        data: {
          fileUrl: nationalIdImageUrl,
          verificationStatus: ApprovalStatus.PENDING,
          reviewNotes: null,
        },
      });
    } else {
      await db.kitchenDocument.create({
        data: {
          kitchenId: kitchen.id,
          documentType: "national_id",
          fileUrl: nationalIdImageUrl,
          verificationStatus: ApprovalStatus.PENDING,
        },
      });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/kitchen/onboarding");
  redirect("/dashboard/kitchen/submitted");
}
