const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function orderHistoryDayLabel(date: Date, now = new Date()): string {
  if (Number.isNaN(date.getTime())) return "تاريخ غير معروف";
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) return "اليوم";
  if (diffDays === 1) return "أمس";
  const month = MONTHS_AR[date.getMonth()] ?? "";
  return `${date.getDate()} ${month} ${date.getFullYear()}`;
}

export function formatOrderClock(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const suffix = hours >= 12 ? "م" : "ص";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${suffix}`;
}

export function groupOrdersNewestFirst<T extends { createdAt: string }>(
  orders: T[],
  now = new Date(),
): Array<{ label: string; orders: T[] }> {
  const sorted = [...orders].sort((a, b) => {
    const left = new Date(b.createdAt).getTime();
    const right = new Date(a.createdAt).getTime();
    return (Number.isNaN(left) ? 0 : left) - (Number.isNaN(right) ? 0 : right);
  });

  const groups: Array<{ label: string; orders: T[] }> = [];
  for (const order of sorted) {
    const label = orderHistoryDayLabel(new Date(order.createdAt), now);
    const last = groups[groups.length - 1];
    if (!last || last.label !== label) {
      groups.push({ label, orders: [order] });
    } else {
      last.orders.push(order);
    }
  }
  return groups;
}
