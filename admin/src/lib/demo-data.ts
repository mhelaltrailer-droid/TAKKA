import { pointInRing, OBOUR_DISTRICT_POLYGONS, type LngLat } from "./obour-geofence";
import { slugify } from "./slug";

/**
 * Pure catalog for marketplace demo kitchens.
 * Public strings stay free of city names and of any demo label.
 * `isDemo` on the rows is the only marker, and it is not rendered.
 */

const U = (photo: string) =>
  `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=1200&q=80`;

export const DEMO_KITCHEN_NAMES = [
  "مطبخ أم محمد",
  "سفرة أم علي",
  "بيت ست الحبايب",
  "مطبخ الحاجة فاطمة",
  "أكلات أم يوسف",
  "مطبخ أم أحمد",
  "على أصوله",
  "سفرة الجمعة",
  "مطبخ أم حسن",
  "طاجن أم سامي",
  "مطبخ أم إبراهيم",
  "من بيت أم نور",
  "مطبخ أم خالد",
  "سفرة أم محمود",
  "مطبخ الحاجة زينب",
  "طعم زمان",
  "مطبخ أم عمر",
  "صواني أم هاني",
  "مطبخ أم مصطفى",
  "محشي أم كريم",
  "مطبخ الحاجة نادية",
  "من يد أم مريم",
  "مطبخ أم طارق",
  "عزومة البيت",
  "مطبخ أم وليد",
  "فطير أم عادل",
  "أكلات أم شيماء",
  "مطبخ الحاجة عفاف",
  "طاجن البيت",
  "مطبخ أم حسام",
  "سفرة أم رانيا",
  "مطبخ أم شريف",
  "حلويات أم لبنى",
  "مطبخ أم ماجد",
  "من مطبخ أم إيمان",
  "مطبخ أم ياسر",
  "سفرة أم منى",
  "مطبخ أم حاتم",
  "بيت أم نهال",
  "مطبخ أم كمال",
] as const;

const EXTRA_GIVEN_NAMES = [
  "نجوى",
  "سعاد",
  "هدى",
  "منال",
  "دينا",
  "لمياء",
  "وفاء",
  "سمية",
  "نهى",
  "إيناس",
  "غادة",
  "رباب",
  "سحر",
  "مي",
  "عبير",
] as const;

const HOURS = [
  "التسليم من ٤ العصر لحد ١٠ بالليل",
  "الاستلام من ١٢ الظهر لحد ٩ بالليل",
  "الطلبات الكبيرة قبلها بيوم، والتسليم من ٣ العصر",
  "المطبخ شغال من ١٠ الصبح لحد ٨ بالليل",
  "آخر طلب الساعة ٦، والتسليم لحد ٩ بالليل",
] as const;

const STREETS = [
  "النخيل",
  "الورد",
  "الزيتون",
  "الياسمين",
  "الحديقة",
  "التوحيد",
  "النرجس",
  "الأندلس",
  "السلام",
  "المزرعة",
] as const;

const KNOWN_OWNER_NAMES: Record<string, string> = {
  "بيت ست الحبايب": "ست الحبايب",
  "على أصوله": "أم جمال",
  "سفرة الجمعة": "أم جمعة",
  "طعم زمان": "أم عواطف",
  "عزومة البيت": "أم عزت",
  "طاجن البيت": "أم طه",
};

/** Home-cooking photos used as logo, cover, and gallery. */
const HOME_PHOTOS = [
  U("photo-1606787366850-de6330128bfc"),
  U("photo-1556910103-1c02745aae4d"),
  U("photo-1414235077428-338989a2e8c0"),
  U("photo-1466637574441-749b8f19452f"),
  U("photo-1495521821757-a1efb6729352"),
  U("photo-1478144592103-25e218a04891"),
  "https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg",
  "https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg",
  "https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg",
  "https://images.pexels.com/photos/4253320/pexels-photo-4253320.jpeg",
  "https://images.pexels.com/photos/8477224/pexels-photo-8477224.jpeg",
  "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg",
] as const;

type Readiness = "AVAILABLE_NOW" | "PREORDER" | "ASK_KITCHEN";

type DishSize = { sizeName: string; price: number };

type DishDef = {
  name: string;
  description: string;
  categoryId: string;
  price: number;
  imageUrl: string;
  orderReadiness: Readiness;
  sizes?: DishSize[];
};

const DISHES: readonly DishDef[] = [
  {
    name: "محشي مشكل",
    description: "كوسة وفلفل وورق عنب محشيين أرز وخلطة البيت، الصينية بتطلع سخنة.",
    categoryId: "mahshi",
    price: 160,
    imageUrl: "https://images.pexels.com/photos/6287525/pexels-photo-6287525.jpeg",
    orderReadiness: "PREORDER",
    sizes: [
      { sizeName: "صينية صغيرة", price: 160 },
      { sizeName: "صينية كبيرة", price: 290 },
    ],
  },
  {
    name: "ورق عنب",
    description: "لفة رفيعة وحشوة أرز وليمون، متسبك على نار هادية.",
    categoryId: "mahshi",
    price: 120,
    imageUrl: "https://images.pexels.com/photos/5774149/pexels-photo-5774149.jpeg",
    orderReadiness: "AVAILABLE_NOW",
  },
  {
    name: "محشي كرنب",
    description: "كرنب بلدي محشي أرز وتقلية، طعمه لاذع خفيف.",
    categoryId: "mahshi",
    price: 110,
    imageUrl: "https://images.pexels.com/photos/5409015/pexels-photo-5409015.jpeg",
    orderReadiness: "AVAILABLE_NOW",
  },
  {
    name: "ملوخية فراخ",
    description: "ملوخية خضرا متقطعة ناعم، بمرق الفراخ وتوم مقلي.",
    categoryId: "stew",
    price: 145,
    imageUrl: U("photo-1455619452474-d2be8b1e70cd"),
    orderReadiness: "AVAILABLE_NOW",
  },
  {
    name: "بامية باللحمة",
    description: "بامية طازة بصلصة وقطع لحمة، أحسن حاجة مع عيش بلدي.",
    categoryId: "stew",
    price: 175,
    imageUrl: U("photo-1476224203421-9ac39bcb3327"),
    orderReadiness: "AVAILABLE_NOW",
  },
  {
    name: "مكرونة بشاميل",
    description: "طبقة مكرونة ولحمة مفرومة وبشاميل متحمر من فوق.",
    categoryId: "pasta",
    price: 130,
    imageUrl: "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg",
    orderReadiness: "AVAILABLE_NOW",
    sizes: [
      { sizeName: "فردي", price: 90 },
      { sizeName: "عائلي", price: 210 },
    ],
  },
  {
    name: "مكرونة كبدة",
    description: "مكرونة بصلصة الكبدة والتوم، وجبة سريعة من البيت.",
    categoryId: "pasta",
    price: 125,
    imageUrl: "https://images.pexels.com/photos/1437267/pexels-photo-1437267.jpeg",
    orderReadiness: "AVAILABLE_NOW",
  },
  {
    name: "كفتة مشوية",
    description: "كفتة لحمة متبّلة ببقدونس وبصل، متشوّية لحد ما تتحمّر.",
    categoryId: "grills",
    price: 185,
    imageUrl: U("photo-1555939594-58d7cb561ad1"),
    orderReadiness: "AVAILABLE_NOW",
    sizes: [
      { sizeName: "ربع كيلو", price: 95 },
      { sizeName: "نص كيلو", price: 185 },
    ],
  },
  {
    name: "شيش طاووق",
    description: "صدور متقطعة ومتتبلة بزبادي وشوية فحم.",
    categoryId: "grills",
    price: 210,
    imageUrl: U("photo-1544025162-d76694265947"),
    orderReadiness: "AVAILABLE_NOW",
  },
  {
    name: "فطير مشلتت",
    description: "طبقات رقاق بالسمن، مقرمش من بره وطري من جوه.",
    categoryId: "bakery",
    price: 140,
    imageUrl: "https://images.pexels.com/photos/1775043/pexels-photo-1775043.jpeg",
    orderReadiness: "PREORDER",
    sizes: [
      { sizeName: "ربع كيلو", price: 70 },
      { sizeName: "نص كيلو", price: 140 },
      { sizeName: "كيلو", price: 260 },
    ],
  },
  {
    name: "كنافة بالقشطة",
    description: "كنافة محمصة بقشطة وسكر خفيف، بتتاكل دافية.",
    categoryId: "candy",
    price: 95,
    imageUrl: "https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg",
    orderReadiness: "AVAILABLE_NOW",
    sizes: [
      { sizeName: "طبق", price: 95 },
      { sizeName: "صينية", price: 230 },
    ],
  },
  {
    name: "بسبوسة",
    description: "بسبوسة سميد بالمكسرات وقطر متظبط، مش مسكّرة زيادة.",
    categoryId: "candy",
    price: 80,
    imageUrl: U("photo-1519676867240-f03562e64548"),
    orderReadiness: "AVAILABLE_NOW",
  },
  {
    name: "أم علي",
    description: "رقائق ومكسرات ولبن وسكر، بتقدم سخنة في الطاجن.",
    categoryId: "dessert",
    price: 85,
    imageUrl: U("photo-1488477181946-6428a0291777"),
    orderReadiness: "AVAILABLE_NOW",
  },
  {
    name: "فراخ مشوية",
    description: "فرخة متتبلة من بالليل ومتشوّية لحد ما الجلد يقرمش.",
    categoryId: "poultry",
    price: 240,
    imageUrl: "https://images.pexels.com/photos/2679501/pexels-photo-2679501.jpeg",
    orderReadiness: "AVAILABLE_NOW",
    sizes: [
      { sizeName: "نصف فرخة", price: 130 },
      { sizeName: "فرخة", price: 240 },
    ],
  },
  {
    name: "شوربة لسان عصفور",
    description: "شوربة مرق بيتي بلسان العصفور، خفيفة ومناسبة للغدا.",
    categoryId: "soups",
    price: 70,
    imageUrl: "https://images.pexels.com/photos/769289/pexels-photo-769289.jpeg",
    orderReadiness: "AVAILABLE_NOW",
  },
  {
    name: "سمك بلطي سنجاري",
    description: "بلطي طازة بصلصة وطماطم وفلفل، متقدم مع رز أبيض.",
    categoryId: "seafood",
    price: 195,
    imageUrl: "https://images.pexels.com/photos/262959/pexels-photo-262959.jpeg",
    orderReadiness: "AVAILABLE_NOW",
  },
  {
    name: "كشري",
    description: "رز ومكرونة وعدس وصلصة ودقة، طبق كامل من البيت.",
    categoryId: "popular",
    price: 70,
    imageUrl: "https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg",
    orderReadiness: "AVAILABLE_NOW",
  },
  {
    name: "طاجن بامية",
    description: "طاجن بامية بصلصة متسبكة، يكفي اتنين تايمين.",
    categoryId: "tagine",
    price: 155,
    imageUrl: "https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg",
    orderReadiness: "PREORDER",
  },
  {
    name: "فول مدمس",
    description: "فول منقوع ومتدمس بزيت حار وكمون ولمون.",
    categoryId: "breakfast",
    price: 65,
    imageUrl: "https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg",
    orderReadiness: "AVAILABLE_NOW",
  },
  {
    name: "ممبار",
    description: "ممبار متتنظيف ومتحشي أرز وخلطة، اسأل عن الكمية المتاحة.",
    categoryId: "musammat",
    price: 160,
    imageUrl: "https://images.pexels.com/photos/1624487/pexels-photo-1624487.jpeg",
    orderReadiness: "ASK_KITCHEN",
  },
  {
    name: "فتة لحمة",
    description: "عيش محمص ومرق لحمة وثوم وخل، تتقدم سخنة.",
    categoryId: "meals",
    price: 200,
    imageUrl: U("photo-1529042410759-befb1204b468"),
    orderReadiness: "AVAILABLE_NOW",
  },
  {
    name: "سلطة بلدي",
    description: "طماطم وخيار وفلفل وبقدونس بلمون وزيت.",
    categoryId: "salads",
    price: 65,
    imageUrl: "https://images.pexels.com/photos/2097090/pexels-photo-2097090.jpeg",
    orderReadiness: "AVAILABLE_NOW",
  },
  {
    name: "حواوشي",
    description: "عيش بلدي محشي لحمة مفرومة وفلفل، داخل الفرن لحد ما يتحمّر.",
    categoryId: "savory",
    price: 90,
    imageUrl: "https://images.pexels.com/photos/1854652/pexels-photo-1854652.jpeg",
    orderReadiness: "AVAILABLE_NOW",
  },
  {
    name: "جمبري مشوي",
    description: "جمبري متتبل بثوم ولمون، متشوي على نار عالية.",
    categoryId: "seafood",
    price: 320,
    imageUrl: "https://images.pexels.com/photos/1239347/pexels-photo-1239347.jpeg",
    orderReadiness: "AVAILABLE_NOW",
    sizes: [
      { sizeName: "نصف كيلو", price: 180 },
      { sizeName: "كيلو", price: 320 },
    ],
  },
  {
    name: "تورتة شوكولاتة",
    description: "تورتة كاكاو بكريمة خفيفة، تتحجز قبلها بيوم.",
    categoryId: "cake",
    price: 280,
    imageUrl: "https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg",
    orderReadiness: "PREORDER",
    sizes: [
      { sizeName: "٨ أشخاص", price: 220 },
      { sizeName: "١٢ شخص", price: 340 },
    ],
  },
  {
    name: "عصير برتقال",
    description: "برتقال معصور في نفس اليوم، من غير سكر زيادة.",
    categoryId: "drinks",
    price: 60,
    imageUrl: "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg",
    orderReadiness: "AVAILABLE_NOW",
  },
  {
    name: "صدور مشوية",
    description: "صدور متبّلة مشوية، من غير صوص تقيل.",
    categoryId: "healthy",
    price: 175,
    imageUrl: U("photo-1532550907401-a500c9a57435"),
    orderReadiness: "AVAILABLE_NOW",
  },
  {
    name: "أرز معمر",
    description: "أرز باللبن والقشطة ووش متحمر، يطلع من الفرن سخن.",
    categoryId: "meals",
    price: 110,
    imageUrl: U("photo-1512058564366-18510be2db19"),
    orderReadiness: "AVAILABLE_NOW",
  },
  {
    name: "مسقعة",
    description: "باذنجان مقلي بصلصة وثوم، طبق جانبي أو غدا خفيف.",
    categoryId: "stew",
    price: 100,
    imageUrl: "https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg",
    orderReadiness: "AVAILABLE_NOW",
  },
  {
    name: "قطايف بالمكسرات",
    description: "قطايف محشية مكسرات ومتحمّرة، تتاكل دافية.",
    categoryId: "dessert",
    price: 90,
    imageUrl: U("photo-1571115177098-24ec42ed204d"),
    orderReadiness: "AVAILABLE_NOW",
  },
];

const BANNED_CITY =
  /العبور|القاهرة|الجيزة|الإسكندرية|الاسكندرية|obour|cairo|giza|alexandria/i;
const BANNED_DEMO = /demo|ديمو|تجريبي|تجربة/i;

export type DemoRegionRef = {
  id: string;
  regionName: string;
  cityName: string;
  isActive: boolean;
  sortOrder: number;
  polygonRingJson?: string | null;
};

export type DemoSizePlan = {
  sizeName: string;
  price: string;
  depositAmount: string;
};

export type DemoMenuPlan = {
  sortOrder: number;
  name: string;
  description: string;
  categoryId: string;
  basePrice: string;
  discountedPrice: string | null;
  depositAmount: string;
  imageUrl: string;
  isAvailable: true;
  approvalStatus: "APPROVED";
  orderReadiness: Readiness;
  isDishOfTheDay: boolean;
  dishOfTheDayPrice: string | null;
  dishOfTheDayQty: number | null;
  sizes: DemoSizePlan[];
};

export type DemoKitchenPlan = {
  regionId: string;
  regionName: string;
  cityName: string;
  kitchenName: string;
  ownerName: string;
  slug: string;
  description: string;
  addressLine: string;
  phoneNumber: string;
  logoUrl: string;
  coverImageUrl: string;
  galleryUrls: string[];
  latitude: number | null;
  longitude: number | null;
  items: [DemoMenuPlan, DemoMenuPlan, DemoMenuPlan];
};

export type DemoSkip = {
  regionName: string;
  reason: "inactive" | "catch-all";
};

export function foldArabic(value: string): string {
  return value
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Catch-all district labels such as حي آخر and حي آخر — … */
export function isCatchAllRegionName(regionName: string): boolean {
  const name = foldArabic(regionName);
  if (
    name === "حي اخر" ||
    name === "اخر" ||
    name === "اخرى" ||
    name === "حي اخرى" ||
    name === "other"
  ) {
    return true;
  }
  if (name.startsWith("حي اخر")) return true;
  if (
    name.startsWith("other ") ||
    name.startsWith("other-") ||
    name.startsWith("other—")
  ) {
    return true;
  }
  return false;
}

export function shouldSeedRegion(region: {
  regionName: string;
  isActive: boolean;
}): boolean {
  return region.isActive && !isCatchAllRegionName(region.regionName);
}

export function lineHasBannedToken(value: string): boolean {
  return BANNED_CITY.test(value) || BANNED_DEMO.test(value);
}

export function kitchenNameAt(index: number): string {
  if (index < DEMO_KITCHEN_NAMES.length) {
    return DEMO_KITCHEN_NAMES[index]!;
  }
  const extra = index - DEMO_KITCHEN_NAMES.length;
  const given = EXTRA_GIVEN_NAMES[extra % EXTRA_GIVEN_NAMES.length]!;
  const round = Math.floor(extra / EXTRA_GIVEN_NAMES.length);
  const base = `مطبخ أم ${given}`;
  return round === 0 ? base : `${base} ${round + 1}`;
}

export function ownerNameForKitchen(kitchenName: string): string {
  const known = KNOWN_OWNER_NAMES[kitchenName];
  if (known) return known;
  const match = kitchenName.match(/(?:أم|الحاجة)\s+[\u0600-\u06FF]+/);
  return match?.[0] ?? "أم البيت";
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function describeDatabaseTarget(databaseUrl: string | undefined): string {
  if (!databaseUrl) return "(DATABASE_URL is not set)";
  try {
    const parsed = new URL(databaseUrl);
    const name = parsed.pathname.replace(/^\//, "") || "(unknown)";
    const port = parsed.port || "5432";
    return `${parsed.hostname}:${port}/${name}`;
  } catch {
    return "(could not parse DATABASE_URL)";
  }
}

export function demoPlanPublicCopy(plan: DemoKitchenPlan): string[] {
  return [
    plan.kitchenName,
    plan.ownerName,
    plan.slug,
    plan.description,
    plan.addressLine,
    ...plan.items.flatMap((item) => [
      item.name,
      item.description,
      ...item.sizes.map((size) => size.sizeName),
    ]),
  ];
}

export function collectDemoImageUrls(plans: readonly DemoKitchenPlan[]): string[] {
  const urls = new Set<string>();
  for (const plan of plans) {
    urls.add(plan.logoUrl);
    urls.add(plan.coverImageUrl);
    for (const url of plan.galleryUrls) urls.add(url);
    for (const item of plan.items) urls.add(item.imageUrl);
  }
  return [...urls];
}

function money(value: number): string {
  return value.toFixed(2);
}

function depositFor(price: number, discounted: number | null): string {
  const effective = discounted ?? price;
  const amount = Math.min(
    Math.round(effective * 0.3),
    Math.floor(effective * 0.6),
  );
  if (amount <= 0 || amount > effective * 0.6 + 0.001) {
    throw new Error(`Deposit out of range for price ${price}.`);
  }
  return money(amount);
}

function assertPrice(price: number, label: string) {
  if (!Number.isInteger(price) || price < 60 || price > 350) {
    throw new Error(`${label} price ${price} is outside 60–350 EGP.`);
  }
}

function districtPublicLabel(regionName: string): string {
  const trimmed = regionName.trim();
  if (!trimmed || lineHasBannedToken(trimmed)) return "الحي";
  return trimmed;
}

function compareRegions(a: DemoRegionRef, b: DemoRegionRef): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  const byName = a.regionName.localeCompare(b.regionName, "ar");
  if (byName !== 0) return byName;
  return a.id.localeCompare(b.id);
}

function dishTrio(regionId: string): [DishDef, DishDef, DishDef] {
  const count = DISHES.length;
  const start = hashString(regionId) % count;
  const indexes = [start];
  for (const step of [7, 13, 3, 5, 11]) {
    const next = (start + step) % count;
    if (!indexes.includes(next)) indexes.push(next);
    if (indexes.length === 3) break;
  }
  const [a, b, c] = indexes;
  return [DISHES[a]!, DISHES[b]!, DISHES[c]!];
}

function toMenuPlan(dish: DishDef, sortOrder: number): DemoMenuPlan {
  assertPrice(dish.price, dish.name);
  const discounted =
    sortOrder === 1 && dish.price >= 100 ? dish.price - 20 : null;
  if (discounted != null) assertPrice(discounted, `${dish.name} sale`);
  const sizes = (dish.sizes ?? []).map((size) => {
    assertPrice(size.price, `${dish.name} / ${size.sizeName}`);
    return {
      sizeName: size.sizeName,
      price: money(size.price),
      depositAmount: depositFor(size.price, null),
    };
  });
  return {
    sortOrder,
    name: dish.name,
    description: dish.description,
    categoryId: dish.categoryId,
    basePrice: money(dish.price),
    discountedPrice: discounted == null ? null : money(discounted),
    depositAmount: depositFor(dish.price, discounted),
    imageUrl: dish.imageUrl,
    isAvailable: true,
    approvalStatus: "APPROVED",
    orderReadiness: dish.orderReadiness,
    isDishOfTheDay: false,
    dishOfTheDayPrice: null,
    dishOfTheDayQty: null,
    sizes,
  };
}

function withOneDishOfTheDay(
  items: [DemoMenuPlan, DemoMenuPlan, DemoMenuPlan],
): [DemoMenuPlan, DemoMenuPlan, DemoMenuPlan] {
  const preferred =
    [items[2], items[0], items[1]].find((item) => Number(item.basePrice) - 15 >= 60) ??
    null;
  return items.map((item) => {
    const selected = preferred != null && item.sortOrder === preferred.sortOrder;
    const dishOfTheDayPrice = selected ? Number(item.basePrice) - 15 : null;
    return {
      ...item,
      isDishOfTheDay: selected,
      dishOfTheDayPrice: dishOfTheDayPrice == null ? null : money(dishOfTheDayPrice),
      dishOfTheDayQty: selected ? 8 : null,
    };
  }) as [DemoMenuPlan, DemoMenuPlan, DemoMenuPlan];
}

function pickPhotos(start: number, avoid: ReadonlySet<string>, count: number): string[] {
  const picked: string[] = [];
  for (let step = 0; step < HOME_PHOTOS.length && picked.length < count; step += 1) {
    const url = HOME_PHOTOS[(start + step) % HOME_PHOTOS.length]!;
    if (avoid.has(url) || picked.includes(url)) continue;
    picked.push(url);
  }
  if (picked.length < count) {
    throw new Error("Not enough distinct demo photos.");
  }
  return picked;
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function parseRing(polygonRingJson: string | null | undefined): readonly LngLat[] | null {
  if (!polygonRingJson) return null;
  try {
    const parsed = JSON.parse(polygonRingJson) as unknown;
    if (!Array.isArray(parsed) || parsed.length < 4) return null;
    const ring: LngLat[] = [];
    for (const point of parsed) {
      if (!Array.isArray(point) || point.length < 2) return null;
      const lng = Number(point[0]);
      const lat = Number(point[1]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
      ring.push([lng, lat]);
    }
    return ring;
  } catch {
    return null;
  }
}

function pinInside(ring: readonly LngLat[]): { latitude: number; longitude: number } | null {
  const last = ring[ring.length - 1]!;
  const first = ring[0]!;
  const open =
    first[0] === last[0] && first[1] === last[1] ? ring.slice(0, -1) : ring.slice();
  if (open.length < 3) return null;
  let lng = 0;
  let lat = 0;
  for (const [x, y] of open) {
    lng += x;
    lat += y;
  }
  lng /= open.length;
  lat /= open.length;
  if (pointInRing(lng, lat, ring)) {
    return { longitude: round6(lng), latitude: round6(lat) };
  }
  for (const [x, y] of open) {
    const midLng = (x + lng) / 2;
    const midLat = (y + lat) / 2;
    if (pointInRing(midLng, midLat, ring)) {
      return { longitude: round6(midLng), latitude: round6(midLat) };
    }
  }
  return { longitude: round6(open[0]![0]), latitude: round6(open[0]![1]) };
}

export function demoPin(
  regionName: string,
  polygonRingJson?: string | null,
): { latitude: number; longitude: number } | null {
  const ring =
    parseRing(polygonRingJson) ??
    OBOUR_DISTRICT_POLYGONS.find((polygon) => polygon.name === regionName)?.ring ??
    null;
  if (!ring) return null;
  return pinInside(ring);
}

function demoPhone(used: Set<string>, hash: number): string {
  for (let step = 0; step < 9000; step += 1) {
    const suffix = String(((hash + step) % 9000) + 1000);
    const phone = `0100000${suffix}`;
    if (!used.has(phone)) {
      used.add(phone);
      return phone;
    }
  }
  throw new Error("Exhausted placeholder phone numbers.");
}

function buildPlan(
  region: DemoRegionRef,
  kitchenName: string,
  phoneNumber: string,
): DemoKitchenPlan {
  const hash = hashString(region.id);
  const place = districtPublicLabel(region.regionName);
  const hours = HOURS[hash % HOURS.length]!;
  const bios = [
    `أكل بيتي طازة من ${place}. المحشي والطبيخ بيجهزوا كل يوم والكميات بتخلّص. ${hours}.`,
    `سفرة بيتية على أصولها في ${place}. كل حاجة بتتعمل في نفس اليوم وبكميات صغيرة. ${hours}.`,
    `من مطبخ بيتي في ${place}. أكل مصري بيتي، متتبل في البيت ومتقدم سخن. ${hours}.`,
    `عزومة بيت في ${place}. صواني وأطباق يومية، ولو الكمية كبيرة اطلب قبلها. ${hours}.`,
  ];
  const building = 4 + (hash % 32);
  const floor = ["الدور الأرضي", "الدور الأول", "الدور الثاني", "الدور الثالث"][hash % 4]!;
  const street = STREETS[hash % STREETS.length]!;
  const [first, second, third] = dishTrio(region.id);
  const items = withOneDishOfTheDay([
    toMenuPlan(first, 0),
    toMenuPlan(second, 1),
    toMenuPlan(third, 2),
  ]);
  const avoid = new Set(items.map((item) => item.imageUrl));
  const [logoUrl, coverImageUrl, ...galleryUrls] = pickPhotos(hash % HOME_PHOTOS.length, avoid, 4);
  const pin = demoPin(region.regionName, region.polygonRingJson);
  const slug = `${slugify(kitchenName) || "kitchen"}-${region.id.replace(/[^a-z0-9]/gi, "").slice(-6).toLowerCase()}`;
  const plan: DemoKitchenPlan = {
    regionId: region.id,
    regionName: region.regionName,
    cityName: region.cityName,
    kitchenName,
    ownerName: ownerNameForKitchen(kitchenName),
    slug,
    description: bios[hash % bios.length]!,
    addressLine: `عمارة ${building}، شارع ${street}، ${floor}، ${place}`,
    phoneNumber,
    logoUrl: logoUrl!,
    coverImageUrl: coverImageUrl!,
    galleryUrls,
    latitude: pin?.latitude ?? null,
    longitude: pin?.longitude ?? null,
    items,
  };
  for (const line of demoPlanPublicCopy(plan)) {
    if (lineHasBannedToken(line)) {
      throw new Error(`Demo copy includes a forbidden token: ${line}`);
    }
  }
  if (!/^01[0-9]{9}$/.test(plan.phoneNumber)) {
    throw new Error(`Placeholder phone is invalid: ${plan.phoneNumber}`);
  }
  return plan;
}

export function buildDemoPlans(regions: readonly DemoRegionRef[]): {
  plans: DemoKitchenPlan[];
  skipped: DemoSkip[];
} {
  const skipped: DemoSkip[] = [];
  const eligible: DemoRegionRef[] = [];
  for (const region of regions) {
    if (!region.isActive) {
      skipped.push({ regionName: region.regionName, reason: "inactive" });
      continue;
    }
    if (isCatchAllRegionName(region.regionName)) {
      skipped.push({ regionName: region.regionName, reason: "catch-all" });
      continue;
    }
    eligible.push(region);
  }
  eligible.sort(compareRegions);
  const usedNames = new Set<string>();
  const usedPhones = new Set<string>();
  const plans = eligible.map((region) => {
    const hash = hashString(region.id);
    let kitchenName = "";
    for (let step = 0; step < 120; step += 1) {
      const candidate = kitchenNameAt((hash % DEMO_KITCHEN_NAMES.length) + step);
      if (!usedNames.has(candidate)) {
        kitchenName = candidate;
        usedNames.add(candidate);
        break;
      }
    }
    if (!kitchenName) {
      throw new Error(`No kitchen name left for ${region.regionName}.`);
    }
    return buildPlan(region, kitchenName, demoPhone(usedPhones, hash));
  });
  return { plans, skipped };
}
