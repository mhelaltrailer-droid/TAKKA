import { db } from "@/lib/db";

export async function recalculateKitchenRating(kitchenId: string) {
  const reviews = await db.review.findMany({
    where: {
      kitchenId,
      visibility: "VISIBLE",
    },
    select: {
      ratingValue: true,
    },
  });

  const reviewsCount = reviews.length;
  const averageRating =
    reviewsCount === 0
      ? 0
      : reviews.reduce((sum, review) => sum + review.ratingValue, 0) / reviewsCount;

  await db.kitchen.update({
    where: {
      id: kitchenId,
    },
    data: {
      averageRating,
      reviewsCount,
    },
  });
}
