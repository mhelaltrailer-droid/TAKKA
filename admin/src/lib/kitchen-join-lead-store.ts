import { db } from "@/lib/db";

import type { KitchenJoinLeadStore } from "./join-kitchen-submit";

export const prismaKitchenJoinLeadStore: KitchenJoinLeadStore = {
  findOpenByWhatsapp(whatsapp) {
    return db.kitchenJoinLead.findFirst({
      where: {
        whatsapp,
        status: { not: "CLOSED" },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
  },
  create(data) {
    return db.kitchenJoinLead.create({
      data: {
        ...data,
        status: "NEW",
      },
      select: { id: true },
    });
  },
};
