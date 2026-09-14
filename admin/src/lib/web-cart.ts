export type WebCartItem = {
  id: string;
  menuItemId: string;
  menuItemName: string;
  menuItemSizeId: string | null;
  sizeName: string | null;
  unitPrice: number;
  depositAmount: number;
  quantity: number;
  orderReadiness: string;
};

export type WebCartState = {
  kitchenId: string | null;
  kitchenName: string | null;
  kitchenSlug: string | null;
  kitchenLatitude: number | null;
  kitchenLongitude: number | null;
  kitchenAddressLine: string | null;
  kitchenRegionLabel: string | null;
  items: WebCartItem[];
};

const STORAGE_KEY = "takka_web_cart_v1";

type Listener = () => void;

let memory: WebCartState = {
  kitchenId: null,
  kitchenName: null,
  kitchenSlug: null,
  kitchenLatitude: null,
  kitchenLongitude: null,
  kitchenAddressLine: null,
  kitchenRegionLabel: null,
  items: [],
};

const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function readStorage(): WebCartState {
  if (typeof window === "undefined") {
    return memory;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return memory;
    }
    const parsed = JSON.parse(raw) as WebCartState;
    memory = {
      kitchenId: parsed.kitchenId ?? null,
      kitchenName: parsed.kitchenName ?? null,
      kitchenSlug: parsed.kitchenSlug ?? null,
      kitchenLatitude:
        typeof parsed.kitchenLatitude === "number"
          ? parsed.kitchenLatitude
          : null,
      kitchenLongitude:
        typeof parsed.kitchenLongitude === "number"
          ? parsed.kitchenLongitude
          : null,
      kitchenAddressLine: parsed.kitchenAddressLine ?? null,
      kitchenRegionLabel: parsed.kitchenRegionLabel ?? null,
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch {
    // ignore
  }
  return memory;
}

function writeStorage(next: WebCartState) {
  memory = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  emit();
}

export function getWebCart(): WebCartState {
  return readStorage();
}

export function subscribeWebCart(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearWebCart() {
  writeStorage({
    kitchenId: null,
    kitchenName: null,
    kitchenSlug: null,
    kitchenLatitude: null,
    kitchenLongitude: null,
    kitchenAddressLine: null,
    kitchenRegionLabel: null,
    items: [],
  });
}

export function addWebCartItem(params: {
  kitchenId: string;
  kitchenName: string;
  kitchenSlug: string;
  kitchenLatitude?: number | null;
  kitchenLongitude?: number | null;
  kitchenAddressLine?: string | null;
  kitchenRegionLabel?: string | null;
  item: Omit<WebCartItem, "id" | "quantity"> & { quantity?: number };
}) {
  const current = readStorage();
  if (current.items.length && current.kitchenId !== params.kitchenId) {
    throw new Error("لا يمكن إضافة أصناف من أكثر من مطبخ في نفس الطلب.");
  }

  const quantity = params.item.quantity ?? 1;
  const existingIndex = current.items.findIndex(
    (item) =>
      item.menuItemId === params.item.menuItemId &&
      item.menuItemSizeId === params.item.menuItemSizeId,
  );

  const items = [...current.items];
  if (existingIndex >= 0) {
    const existing = items[existingIndex];
    items[existingIndex] = {
      ...existing,
      quantity: existing.quantity + quantity,
    };
  } else {
    items.push({
      id: `${params.item.menuItemId}-${params.item.menuItemSizeId ?? "base"}-${Date.now()}`,
      menuItemId: params.item.menuItemId,
      menuItemName: params.item.menuItemName,
      menuItemSizeId: params.item.menuItemSizeId,
      sizeName: params.item.sizeName,
      unitPrice: params.item.unitPrice,
      depositAmount: params.item.depositAmount,
      quantity,
      orderReadiness: params.item.orderReadiness,
    });
  }

  writeStorage({
    kitchenId: params.kitchenId,
    kitchenName: params.kitchenName,
    kitchenSlug: params.kitchenSlug,
    kitchenLatitude: params.kitchenLatitude ?? current.kitchenLatitude,
    kitchenLongitude: params.kitchenLongitude ?? current.kitchenLongitude,
    kitchenAddressLine:
      params.kitchenAddressLine ?? current.kitchenAddressLine,
    kitchenRegionLabel:
      params.kitchenRegionLabel ?? current.kitchenRegionLabel,
    items,
  });
}

export function updateWebCartQuantity(itemId: string, quantity: number) {
  const current = readStorage();
  if (quantity <= 0) {
    const items = current.items.filter((item) => item.id !== itemId);
    writeStorage({
      ...current,
      kitchenId: items.length ? current.kitchenId : null,
      kitchenName: items.length ? current.kitchenName : null,
      kitchenSlug: items.length ? current.kitchenSlug : null,
      kitchenLatitude: items.length ? current.kitchenLatitude : null,
      kitchenLongitude: items.length ? current.kitchenLongitude : null,
      kitchenAddressLine: items.length ? current.kitchenAddressLine : null,
      kitchenRegionLabel: items.length ? current.kitchenRegionLabel : null,
      items,
    });
    return;
  }

  writeStorage({
    ...current,
    items: current.items.map((item) =>
      item.id === itemId ? { ...item, quantity } : item,
    ),
  });
}

export function webCartTotals(items: WebCartItem[]) {
  return items.reduce(
    (acc, item) => {
      acc.subtotal += item.unitPrice * item.quantity;
      acc.deposit += item.depositAmount * item.quantity;
      acc.count += item.quantity;
      return acc;
    },
    { subtotal: 0, deposit: 0, count: 0 },
  );
}
