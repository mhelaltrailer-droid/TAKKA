import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NotificationType, UserRole } from "@prisma/client";

import {
  isStaleFcmTokenError,
  pushDestination,
  readFirebaseServiceAccount,
} from "./push-message";

describe("readFirebaseServiceAccount", () => {
  it("returns null when nothing is set", () => {
    assert.equal(readFirebaseServiceAccount({}), null);
  });

  it("parses the service account JSON", () => {
    const json = JSON.stringify({
      project_id: "takka-test",
      client_email: "push@takka-test.iam.gserviceaccount.com",
      private_key: "-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n",
    });

    const account = readFirebaseServiceAccount({
      FIREBASE_SERVICE_ACCOUNT_JSON: json,
    });

    assert.equal(account?.projectId, "takka-test");
    assert.equal(account?.clientEmail, "push@takka-test.iam.gserviceaccount.com");
    assert.match(account?.privateKey ?? "", /\nABC\n/);
  });

  it("reads the three separate env vars and unescapes newlines", () => {
    const account = readFirebaseServiceAccount({
      FIREBASE_PROJECT_ID: "takka-test",
      FIREBASE_CLIENT_EMAIL: "push@takka-test.iam.gserviceaccount.com",
      FIREBASE_PRIVATE_KEY: "line-1\\nline-2\\n",
    });

    assert.equal(account?.privateKey, "line-1\nline-2\n");
  });

  it("ignores malformed JSON and placeholder values", () => {
    assert.equal(
      readFirebaseServiceAccount({
        FIREBASE_SERVICE_ACCOUNT_JSON: "{not json",
      }),
      null,
    );
    assert.equal(
      readFirebaseServiceAccount({
        FIREBASE_PROJECT_ID: "replace_me",
        FIREBASE_CLIENT_EMAIL: "push@takka-test.iam.gserviceaccount.com",
        FIREBASE_PRIVATE_KEY: "key",
      }),
      null,
    );
  });
});

describe("pushDestination", () => {
  it("opens kitchen orders for a new order", () => {
    assert.deepEqual(
      pushDestination({
        role: UserRole.KITCHEN_OWNER,
        type: NotificationType.ORDER,
        orderId: "ord_1",
      }),
      { audience: "kitchen", route: "kitchen_orders" },
    );
  });

  it("opens the kitchen home for approval notices", () => {
    assert.deepEqual(
      pushDestination({
        role: UserRole.KITCHEN_OWNER,
        type: NotificationType.SYSTEM,
        orderId: null,
      }),
      { audience: "kitchen", route: "kitchen_home" },
    );
  });

  it("opens order tracking for the customer", () => {
    assert.deepEqual(
      pushDestination({
        role: UserRole.CUSTOMER,
        type: NotificationType.CHAT,
        orderId: "ord_1",
      }),
      { audience: "customer", route: "order_tracking" },
    );
  });
});

describe("isStaleFcmTokenError", () => {
  it("prunes unregistered and invalid tokens only", () => {
    assert.equal(
      isStaleFcmTokenError("messaging/registration-token-not-registered"),
      true,
    );
    assert.equal(
      isStaleFcmTokenError("messaging/invalid-registration-token"),
      true,
    );
    assert.equal(
      isStaleFcmTokenError(
        "messaging/invalid-argument",
        "The registration token is not a valid FCM registration token",
      ),
      true,
    );
    assert.equal(
      isStaleFcmTokenError("messaging/invalid-argument", "payload too large"),
      false,
    );
  });
});
