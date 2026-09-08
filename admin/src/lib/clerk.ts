const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export const isClerkConfigured = Boolean(
  publishableKey && !publishableKey.includes("replace_me"),
);
