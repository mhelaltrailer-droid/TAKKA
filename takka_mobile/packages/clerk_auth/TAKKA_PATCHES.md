# Takka patches on clerk_auth 0.0.18-beta

Upstream `Passkey.fromJson` casts `name` as non-null `String`, but Clerk’s Frontend API returns `name: null` for newly created passkeys. That throws:

`type 'Null' is not a subtype of type 'String' in type cast`

during create/refresh/verify passkey flows.

Also:

- `PasskeyUser` expected `display_name` while WebAuthn/Clerk send `displayName`
- verification `nonce` may arrive as a JSON object, not only a string

Revert/rebase these when upgrading `clerk_auth` if upstream fixes them.
