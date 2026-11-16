# Takka patches on clerk_auth 0.0.18-beta

Upstream `Passkey.fromJson` casts `name` as non-null `String`, but Clerk’s Frontend API returns `name: null` for newly created passkeys. That throws:

`type 'Null' is not a subtype of type 'String' in type cast`

during create/refresh/verify passkey flows.

Also:

- `PasskeyUser` expected `display_name` while WebAuthn/Clerk send `displayName`
- verification `nonce` may arrive as a JSON object, not only a string

Session restore (keep a signed-in user across process death):

- `TokenCache` used `publishableKey.hashCode` as the persistor key suffix. Dart salts `String.hashCode` per process, so the client token written on sign-in could not be read on the next launch. `createClient` then POSTed a brand-new client. Clerk treated that as a new device and asked for the email code again. Keys now use `TokenCache.cacheIdFor` (`v2` + a stable slice of the key), and `initialize` migrates a legacy hash suffix when the persistor can list keys.
- `createClient` no longer calls `resetClient` when a client token exists but GET `/client` fails (offline, timeout, 5xx). Minting a client in that case rotated the token and signed the user out. HTTP 401 still throws `ClerkSessionRejected`.
- `Auth.initialize` restores the persisted client and environment **before** the network call, and ignores an empty/failed fetch. `refreshClient` keeps the current session on transport errors and only signs out on `ClerkSessionRejected`.
- The startup session-token poll does not report errors. A failure there used to throw out of `initialize` (no error listener yet) and leave the app on the loading screen, or surface a dialog, while the user was still signed in locally.
- `DefaultPersistor.terminate` flushes the 600ms debounced write instead of cancelling it. The app passes its own `DurableClerkPersistor`, which writes synchronously to application support and mirrors the client token into secure storage.

Revert/rebase these when upgrading `clerk_auth` if upstream fixes them.
