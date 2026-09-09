import {
  ApprovalStatus,
  AvailabilityStatus,
  PaymentType,
  UserRole,
} from "@prisma/client";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertObourLocation } from "@/lib/districts";
import { OBOUR_CITY_NAME } from "@/lib/obour-areas";
import { slugify } from "@/lib/slug";

type KitchenProfilePayload = {
  kitchenName: string;
  description?: string;
  phoneNumber: string;
  cityName: string;
  regionName: string;
  addressLine: string;
  logoUrl?: string;
  coverImageUrl?: string;
  instapayHandle?: string;
  instapayLink?: string;
  nationalIdImageUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export async function GET() {
  try {
    const user = await requireAuth();

    const kitchen = await db.kitchen.findUnique({
      where: {
        ownerUserId: user.appUserId,
      },
      include: {
        region: true,
        paymentMethods: {
          where: {
            isActive: true,
          },
        },
        documents: {
          where: {
            documentType: "national_id",
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    return NextResponse.json({ kitchen });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحميل بيانات المطبخ.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const payload = (await request.json()) as KitchenProfilePayload;

    const cityName = (payload.cityName || OBOUR_CITY_NAME).trim();
    const regionName = payload.regionName?.trim() ?? "";

    if (
      !payload.kitchenName ||
      !payload.phoneNumber ||
      !regionName ||
      !payload.addressLine
    ) {
      return NextResponse.json(
        { error: "يرجى استكمال الحقول الأساسية للمطبخ قبل الحفظ." },
        { status: 400 },
      );
    }

    const locationError = await assertObourLocation(cityName, regionName);
    if (locationError) {
      return NextResponse.json({ error: locationError }, { status: 400 });
    }

    const latitude =
      typeof payload.latitude === "number" ? payload.latitude : null;
    const longitude =
      typeof payload.longitude === "number" ? payload.longitude : null;

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

    const baseSlug = slugify(payload.kitchenName);
    const uniqueSlug = `${baseSlug || "kitchen"}-${user.appUserId.slice(-6)}`;

    const kitchen = await db.kitchen.upsert({
      where: {
        ownerUserId: user.appUserId,
      },
      update: {
        kitchenName: payload.kitchenName.trim(),
        slug: uniqueSlug,
        description: payload.description?.trim() || null,
        logoUrl: payload.logoUrl?.trim() || null,
        coverImageUrl: payload.coverImageUrl?.trim() || null,
        phoneNumber: payload.phoneNumber.trim(),
        cityName,
        regionId: region.id,
        addressLine: payload.addressLine.trim(),
        latitude,
        longitude,
        approvalStatus: ApprovalStatus.PENDING,
        availabilityStatus: AvailabilityStatus.CLOSED,
      },
      create: {
        ownerUserId: user.appUserId,
        kitchenName: payload.kitchenName.trim(),
        slug: uniqueSlug,
        description: payload.description?.trim() || null,
        logoUrl: payload.logoUrl?.trim() || null,
        coverImageUrl: payload.coverImageUrl?.trim() || null,
        phoneNumber: payload.phoneNumber.trim(),
        cityName,
        regionId: region.id,
        addressLine: payload.addressLine.trim(),
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
        accountNumberOrHandle: payload.instapayHandle?.trim() || null,
        paymentLink: payload.instapayLink?.trim() || null,
        isActive: true,
      },
      create: {
        kitchenId: kitchen.id,
        paymentType: PaymentType.INSTAPAY,
        accountNumberOrHandle: payload.instapayHandle?.trim() || null,
        paymentLink: payload.instapayLink?.trim() || null,
        isActive: true,
      },
    });

    if (payload.nationalIdImageUrl?.trim()) {
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
            fileUrl: payload.nationalIdImageUrl.trim(),
            verificationStatus: ApprovalStatus.PENDING,
            reviewNotes: null,
          },
        });
      } else {
        await db.kitchenDocument.create({
          data: {
            kitchenId: kitchen.id,
            documentType: "national_id",
            fileUrl: payload.nationalIdImageUrl.trim(),
            verificationStatus: ApprovalStatus.PENDING,
          },
        });
      }
    }

    return NextResponse.json({ success: true, kitchen });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر حفظ بيانات المطبخ.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
