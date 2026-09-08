export const APP_ROLES = ["customer", "kitchen_owner", "admin"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

export function getRoleLabel(role: AppRole): string {
  switch (role) {
    case "customer":
      return "عميل";
    case "kitchen_owner":
      return "صاحب مطبخ";
    case "admin":
      return "إدارة";
  }
}
