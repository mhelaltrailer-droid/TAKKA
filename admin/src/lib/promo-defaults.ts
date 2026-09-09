export type PromoBannerSeed = {
  title: string;
  subtitle?: string;
  imageUrl: string;
  priceLabel?: string;
  oldPriceLabel?: string;
  sortOrder: number;
};

/** Temporary default carousel slides until admin uploads custom ones. */
export const DEFAULT_PROMO_BANNERS: PromoBannerSeed[] = [
  {
    title: "صينية بيتية",
    subtitle: "فراخ مشوية ومحاشي ورز",
    imageUrl:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
    priceLabel: "١٥٩ جنيه",
    oldPriceLabel: "٣٦٠",
    sortOrder: 1,
  },
  {
    title: "كيك شوكولاتة",
    subtitle: "حلى منزلي طازج",
    imageUrl:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80",
    priceLabel: "١٤٠ جنيه",
    oldPriceLabel: "١٧٠",
    sortOrder: 2,
  },
  {
    title: "محاشي مشكل",
    subtitle: "وصفات بيتية من مطابخ العبور",
    imageUrl:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80",
    priceLabel: "١٩٩ جنيه",
    oldPriceLabel: "٢٨٠",
    sortOrder: 3,
  },
];
