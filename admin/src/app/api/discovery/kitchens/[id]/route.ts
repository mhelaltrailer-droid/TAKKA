import { ApprovalStatus, AvailabilityStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const kitchen = await db.kitchen.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
      approvalStatus: ApprovalStatus.APPROVED,
      availabilityStatus: AvailabilityStatus.OPEN,
    },
    include: {
      region: true,
      gallery: true,
      paymentMethods: {
        where: {
          isActive: true,
        },
      },
      menuItems: {
        where: {
          isAvailable: true,
        },
        include: {
          sizes: {
            where: {
              isActive: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      reviews: {
        where: {
          visibility: "VISIBLE",
        },
        include: {
          customer: {
            select: {
              fullName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
    },
  });

  if (!kitchen) {
    return NextResponse.json({ error: "المطبخ غير موجود." }, { status: 404 });
  }

  return NextResponse.json({ kitchen });
}
