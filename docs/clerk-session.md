# Clerk session settings for the Takka mobile app

The Flutter app persists the Clerk **client** (the long-lived device credential) and the last known role on the device. Closing the app, swiping it away, or restarting the phone must not ask for email, password, or an email code again.

Those prompts come back only when the user signs out, or when Clerk itself expires the session. The dashboard settings below are what decide that expiry. The app cannot change them; set them on the Clerk instance that matches `CLERK_PUBLISHABLE_KEY`.

## What the app does

- The client token and session snapshot are stored under the app support directory (not the cache), and the client token is also copied into secure storage.
- Writes are flushed immediately. A sign-in that has finished is still on disk if the process is killed right after.
- On the next launch the stored client is restored **before** any network call. The UI shows «جارٍ فتح حسابك…» while that happens, not the sign-in screen and not the role picker.
- If Clerk or the Takka API (`/api/mobile/me`, often asleep on Render) cannot be reached, the user stays signed in. A known role opens customer home or kitchen home immediately. A banner offers retry. Nothing clears the session.
- The role last returned by `/api/mobile/me` is cached per Clerk user id. When that call succeeds and the role changed, the app re-routes.
- HTTP 401 from Clerk (client revoked or session actually rejected) signs the user out. An explicit sign-out does too.

Email codes stay where they belong:

- **Sign-up:** the account still confirms email once.
- **Sign-in on a new client:** Clerk Client Trust may email a code the first time this install is seen.
- **Reopen:** same client token, so Client Trust must not run again.

## Dashboard settings to apply

Clerk Dashboard → **Configure → Sessions** (the instance behind the publishable key):

| Setting | Recommendation | Why |
| --- | --- | --- |
| Maximum lifetime (session lifetime) | **30 days**, or **365 days** if you want reopen to almost never expire | The default is often 7 days. After that, Clerk ends the session and the app must ask for email and password again. |
| Inactivity timeout | **Disabled**, or the same length as the maximum lifetime | A short timeout (hours, or 1 day) expires the session while the app is closed. The next open looks like a fresh sign-in, including an email code if Client Trust is on. |
| Single session vs multi-session | Leave as you use it on the web | The mobile app keeps the active session it already has. This does not force a code on launch. |

Clerk Dashboard → **Attack protection / Client Trust** (wording varies by instance):

- Leave Client Trust **on** if you want a code when someone signs in from a **new device**.
- Do not turn on a policy that requires an email code on **every** sign-in. Reopen is not a new sign-in once the client token is stored.

Clerk Dashboard → **User & authentication → Email**:

- Require email verification for **sign-up**. That is the one-time code.
- Do not require the user to re-verify the same email address on every session.

## After you change them

No new app build is required for the dashboard values. The next new session uses the new lifetime. Sessions already expired on Clerk’s side still need one sign-in; after that they follow the new limits.

The first launch after this app update migrates a client token saved by the previous build when that file is still present. If the old token was never flushed (the previous 600ms delay, or the unstable storage key), that user signs in **once**. Later launches restore.
