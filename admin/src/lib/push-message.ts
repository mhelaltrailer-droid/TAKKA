import { NotificationType, UserRole } from "@prisma/client";

export const TAKKA_PUSH_CHANNEL_ID = "takka_alerts";

export type PushAudience = "kitchen" | "customer";

export type PushRoute =
  | "kitchen_orders"
  | "kitchen_home"
  | "order_tracking"
  | "notifications";

export type FirebaseServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

type EnvLike = Record<string, string | undefined>;

function unescapePrivateKey(value: string) {
  let key = value.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n");
}

function accountFromParts(
  projectId: string | undefined,
  clientEmail: string | undefined,
  privateKey: string | undefined,
): FirebaseServiceAccount | null {
  const project = projectId?.trim() ?? "";
  const email = clientEmail?.trim() ?? "";
  const key = privateKey?.trim() ?? "";
  if (!project || !email || !key) {
    return null;
  }
  if (
    project.includes("replace_me") ||
    email.includes("replace_me") ||
    key.includes("replace_me")
  ) {
    return null;
  }
  return {
    projectId: project,
    clientEmail: email,
    privateKey: unescapePrivateKey(key),
  };
}

/**
 * Reads either FIREBASE_SERVICE_ACCOUNT_JSON or the three separate vars.
 * Returns null when Firebase is not configured so callers can skip push.
 */
export function readFirebaseServiceAccount(
  env: EnvLike = process.env,
): FirebaseServiceAccount | null {
  const rawJson = env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      return accountFromParts(
        parsed.project_id,
        parsed.client_email,
        parsed.private_key,
      );
    } catch {
      return null;
    }
  }

  return accountFromParts(
    env.FIREBASE_PROJECT_ID,
    env.FIREBASE_CLIENT_EMAIL,
    env.FIREBASE_PRIVATE_KEY,
  );
}

export function pushDestination(input: {
  role: UserRole | null | undefined;
  type: NotificationType;
  orderId?: string | null;
}): { audience: PushAudience; route: PushRoute } {
  if (input.role === UserRole.KITCHEN_OWNER) {
    if (input.type === NotificationType.SYSTEM && !input.orderId) {
      return { audience: "kitchen", route: "kitchen_home" };
    }
    return { audience: "kitchen", route: "kitchen_orders" };
  }

  if (input.orderId) {
    return { audience: "customer", route: "order_tracking" };
  }

  return { audience: "customer", route: "notifications" };
}

/** Tokens FCM will never deliver to again. Other errors are left in place. */
export function isStaleFcmTokenError(code?: string, message?: string) {
  if (
    code === "messaging/registration-token-not-registered" ||
    code === "messaging/invalid-registration-token"
  ) {
    return true;
  }

  const text = `${code ?? ""} ${message ?? ""}`.toLowerCase();
  return (
    text.includes("registration-token-not-registered") ||
    text.includes("not a valid fcm registration token") ||
    text.includes("requested entity was not found")
  );
}
