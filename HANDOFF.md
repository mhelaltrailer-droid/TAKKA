# HANDOFF.md — Takka (تكة)

This file is the onboarding brief for any coding agent (Claude, Cursor, etc.) continuing work on Takka. Read it before changing code. Do **not** ask the owner questions this document already answers. Write code comments and PRs in English. When you talk to the owner, use Egyptian Arabic.

آخر تحديث: 18 نوفمبر 2026 بعد الظهر (Africa/Cairo, UTC+2)

---

## 1. What Takka is

Takka (تكة) is a marketplace for homemade food in **Obour City (مدينة العبور), Egypt**. Home kitchens sell to neighbors. Brand colors: orange `#E8742A`, terracotta `#B3541E`, cream `#F6EDE0`.

Current phase: recruit **10–20 home kitchens**. Customers get the app from Google Play later. Kitchens currently use a temporary APK (`com.takka.app`, version `1.0.1+2`). Marketing is organic only (no paid ads).

Repo: https://github.com/mhelaltrailer-droid/TAKKA  
The repo is **public** for launch and kitchen recruitment; it may go private later.

---

## 2. Repository layout

There is no root `README.md`. Planning docs live at the repo root (`PRD.MD`, `Tech-Stack.MD`, `Database-Schema.MD`, and others). Operational docs are under `docs/`.

| Path | Role |
|---|---|
| `admin/` | Next.js 16 app: public/customer web surface, kitchen dashboard, admin dashboard, and all APIs (Prisma + Clerk). Render `rootDir` is this folder. |
| `takka_mobile/` | Flutter app for customers and kitchens (`clerk_flutter` / `clerk_auth`). Android applicationId / namespace: `com.takka.app`. Local fork: `takka_mobile/packages/clerk_auth` (Clerk FAPI null `passkey.name`). |
| `docs/` | `clerk-session.md`, `demo-data.md`, `fcm-setup.md`, `release-apk.md` |
| `marketing/` | Marketing assets and copy |
| `admin/.env.example` | Env var **names** and comments. Never commit real values. |
| `.github/workflows/release-apk.yml` | APK release workflow |

---

## 3. Stack

- **Mobile:** Flutter, `clerk_flutter` `0.0.18-beta`, Pusher, Firebase Cloud Messaging, `flutter_map` / geolocator, image_picker.
- **Web + API:** Next.js `16.3.4`, React 19, Prisma `^6.16.3`, Clerk (`@clerk/nextjs`), Pusher, Cloudflare R2 for media (UploadThing still configured until a few new uploads are tested), nodemailer, firebase-admin, Zod, Tailwind 4. Node `>=20`.
- **Auth:** Clerk (currently in **development** mode). Sessions: **365-day** maximum lifetime, **inactivity timeout disabled** (applied in the Clerk dashboard on 2026-11-18). Details: `docs/clerk-session.md`. Email confirmation stays on email for now (SMS costs money). Admin login works with a Clerk **email code**. There is no Google sign-in option on the admin page. Vault entry `5270388` (Takka admin login) currently has the **wrong password**; the owner should edit or delete that entry. Do not print the password.
- **Realtime:** Pusher.
- **Database:** **Neon PostgreSQL** (not a Render database). PostgreSQL 18.x. Prisma schema: `admin/prisma/schema.prisma`.
- **Media today (main):** Cloudflare R2, bucket `takka-media`. UploadThing remains configured (`UPLOADTHING_TOKEN` is still set) until a few new uploads have been tested; then the owner can remove it.
- **Push:** FCM when Firebase is configured; in-app Pusher notifications still work without it. See `docs/fcm-setup.md`.

### Prisma models (current)

`User`, `Region`, `CustomerAddress`, `Kitchen`, `KitchenViewEvent`, `KitchenDocument`, `KitchenGalleryImage`, `KitchenPaymentMethod`, `MenuItem`, `FlashOffer`, `MenuItemSize`, `Order`, `OrderItem`, `DepositProof`, `OrderMessage`, `OrderIssue`, `Review`, `AdminAction`, `Notification`, `DevicePushToken`, `PromoBanner`, `FoodCategory`, `KitchenJoinLead`.

Enums include `UserRole`, `ApprovalStatus`, `AvailabilityStatus`, `DeliveryType`, `OrderReadiness`, `OrderStatus`, `PaymentType`, and others in the same schema file. A `DeliveryType` enum already exists; a full courier/delivery feature is **not** built yet (see decisions and Next steps).

Demo kitchens are marked internally with `isDemo` so they can be removed in one command before real customers arrive. Scripts: `npm run seed:demo` and `npm run seed:demo:remove` in `admin/`. See `docs/demo-data.md`. Existing media in the database was test data and may be deleted later.

---

## 4. Hosting (Render — old account)

Stay on the **existing** Render account. Migration to a new Render workspace was **postponed on 2026-11-18** after the payment card was declined. Do not create paid services or assume the new account is in use.

Both services: Node, `rootDir` = `admin`, branch `main`, region Oregon, **free** plan, start command `npm run start`.

| Service | URL | Service ID | Build command |
|---|---|---|---|
| **TAKKA-admin** | https://takka-admin.onrender.com | `srv-dagg3nek1f9s73cq6ht0` | `npm install && npm run build` which runs `prisma generate && prisma db push && next build` |
| **TAKKA-App** | https://takka-app.onrender.com | `srv-dagiuaid0e5s73cmn9f0` | `npm install && npm run db:generate && npx next build` (**no** `db push`) |

**Important:** only **TAKKA-admin** runs `prisma db push` during build. TAKKA-App was changed on 2026-11-18 so both services would not race `db push` (that race previously broke a deploy on `OrderIssueType`). Do not put `db push` back on TAKKA-App. The `build` script in `admin/package.json` still includes `db push`; that is what TAKKA-admin uses. TAKKA-App must keep calling `db:generate` + `next build` instead of `npm run build`.

On 18 Nov 2026 afternoon, a TAKKA-admin deploy failed with a Turbopack error resolving the Cairo Google font (`@vercel/turbopack-next/internal/font/google/font`). A plain retry was not enough. A deploy with **`clearCache=true`** went live at **3:35 PM Africa/Cairo (UTC+2)**. If that font error appears again, retry with a cache-clearing deploy rather than only rebuilding.

Free Render services sleep. UptimeRobot pings about every 5 minutes. Do not assume a paid Render plan.

There is **no** `NEXT_PUBLIC_TAKKA_SURFACE` env var on these services. Do not add it unless the owner asks.

Custom domain is postponed; production URLs stay on `*.onrender.com` for now.

---

## 5. Environment variables (names only — never commit or print values)

### On both Render services today

- `CLERK_SECRET_KEY`
- `DATABASE_URL` (Neon connection string)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_PUSHER_CLUSTER`
- `NEXT_PUBLIC_PUSHER_KEY`
- `PUSHER_APP_ID`
- `PUSHER_SECRET`
- `UPLOADTHING_APP_ID`
- `UPLOADTHING_TOKEN` (keep until a few new R2 uploads have been tested)
- `R2_ACCOUNT_ID`
- `R2_BUCKET` (set to `takka-media`)
- `R2_PUBLIC_URL`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

The five R2 variables were added on **both** TAKKA-admin (`srv-dagg3nek1f9s73cq6ht0`) and TAKKA-App (`srv-dagiuaid0e5s73cmn9f0`) on 18 Nov 2026. Do not print their values.

`admin/.env.example` also documents optional vars (not all are necessarily set on Render): `MOBILE_APP_*` (in-app update prompt), `SUPPORT_WHATSAPP_NUMBER`, SMTP / join-kitchen alert vars (`SMTP_*`, `JOIN_KITCHEN_ALERT_*`, optional Telegram and webhook), and Firebase (`FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`).

The owner enters secrets on the service dashboards, never in chat. Never echo secrets, tokens, or connection strings in logs, PRs, or replies.

---

## 6. Media: Cloudflare R2 (UploadThing being retired)

**Decision (2026-11-18):** new uploads go to Cloudflare R2, not UploadThing.

R2 (account used for Takka):

- Bucket: `takka-media`
- Public URL: `https://pub-35d18718f36741e68738b3fd193e189e.r2.dev`
- CORS: `GET`, `PUT`, `POST` from `takka-app.onrender.com` and `takka-admin.onrender.com`
- API token name: `takka-render` (object read/write, `takka-media` only). Keys are in the owner's vault — do not print them.

**PR #7** — https://github.com/mhelaltrailer-droid/TAKKA/pull/7  
Branch: `cursor/r2-uploads-19b7`  
Status as of 18 Nov 2026 afternoon: **squash-merged** as `6c7dd1c`.

**PR #8** — https://github.com/mhelaltrailer-droid/TAKKA/pull/8 (`HANDOFF.md` added)  
Status as of 18 Nov 2026 afternoon: **squash-merged** as `07fb862`.

What the merged R2 work does:

- New web and mobile uploads use a presigned PUT to R2, then save the public R2 URL.
- Mobile: `POST /api/mobile/uploads/presign` then PUT to R2. Legacy `POST /api/mobile/upload` (and `/api/uploads`) still work and store on R2 (those legacy paths convert to WebP).
- Same auth rules and size limits as before (promo banners remain admin-only; logo 4MB, other images 8MB).
- Admin migration page: `/dashboard/admin/media` — Preview, then Execute batch (20 images per batch). Originals are not deleted. Non-UploadThing URLs (including demo) are left alone.

**Image migration (done, 18 Nov 2026 afternoon):** 2 images copied, 2 database links updated, 0 failed, 0 remaining. The existing images were test data and will be deleted later. Keep `UPLOADTHING_TOKEN` until a few **new** uploads have been tested.

---

## 7. Decisions (especially 2026-11-18)

- Database is on **Neon**, not Render. Render is only for app hosting / URLs.
- Stay on the **old Render account**. New-account migration is postponed until a working card is available.
- **Delivery / courier** will be built **inside Takka**, not as a separate prototype. Implementation has **not** started. Design agreed on 18 Nov 2026 afternoon (discussion continues tomorrow):
  - Fee is based on **road distance** from the kitchen location to the client location, using a free routing service such as **OSRM** (not a straight-line distance, and not Google Maps for v1).
  - Starting per-km tiers (all editable in the admin dashboard): **10 EGP/km for 0–3 km**, **7 EGP/km for 3–6 km**, **5 EGP/km for 6–10 km**, and **3.5 EGP/km beyond 10 km** as the floor.
  - Still open: who delivers (Takka couriers, the kitchens, or both); whether the courier experience is a role inside the same Flutter app or a separate app; whether tracking is a live map or order-status stages only.
- **Standing rule:** any configurable value (prices, tiers, limits, feature flags, copy that may change) must live in the **admin dashboard**, never hardcoded.
- Media is on **Cloudflare R2**. PR #7 and PR #8 are merged. Image migration of existing test files is done. Keep `UPLOADTHING_TOKEN` until a few new uploads are tested.
- Clerk sessions: **365 days**, no inactivity timeout (done 2026-11-18).
- `prisma db push` runs only on **TAKKA-admin** (done 2026-11-18).
- Join language: “انضمامك مجاني تمامًا، من غير أي رسوم أو اشتراك” — do not promise it stays free forever.
- Nothing is posted or sent (Facebook, WhatsApp, or anywhere) without the owner's explicit approval each time.
- APKs are delivered as Google Drive links, not WhatsApp.
- Temporary package rename from `com.example` is done; current id is `com.takka.app`.
- Confirmation codes stay on email for now.
- Domain purchase is postponed.
- Kitchen optional signup papers (logo / ID / InstaPay) are intentionally optional at first.
- Demo kitchens: one per neighborhood, three full items each, look real to users, flagged `isDemo` internally.
- Prefers Cursor Auto for coding agents when credits allow. If Auto is unavailable, use Grok 4.7. Warn the owner before any request that would consume a lot of usage.
- Merges need the owner's approval. Do not merge PRs yourself.

Older product decisions and marketing rules are in the launch log (see §11) and the root planning markdown files.

---

## 8. Next steps

Do not start the heavy build items without the owner. Warn before any high-usage request. Continue the delivery discussion tomorrow before writing delivery code.

1. **Delivery (continue tomorrow):** settle the open questions, then give a usage-size estimate and wait for approval before building.
   - Who delivers: Takka couriers, the kitchens, or both?
   - Courier app: a role inside the same Flutter app, or a separate app?
   - Tracking: a live map of the courier, or order-status stages only?
   - Pricing design above is the starting point and must be admin-editable.
2. **Cursor cloud Environment** for this repo.
3. **Facebook group** for Obour / kitchen recruitment (content only with owner approval; agents must not post).
4. **Real release keystore** (see `docs/release-apk.md`). Current distribution is a temporary APK.
5. **Custom domain + Clerk production** instance. Also plan how kitchens that signed up on the Clerk development instance are preserved.
6. **Google Play** launch (customers). Play Console signup fee is a later owner step.
7. Owner should fix or delete vault entry `5270388` (Takka admin login has the wrong password). Admin login currently works via Clerk email code.
8. Package «قِدرة الحي» (weekly menu, limited portions + cutoff, pickup windows, group cook) — discussion only, not implemented. If the owner writes that phrase, bring up the four proposals. Details are in the launch log.
9. Still open product questions: commission vs subscription, cancellation / deposit refund policy, hygiene requirements before activating a kitchen.
10. Gmail 2-Step Verification / App Password for join-kitchen alert email was still locked as of 2026-11-16; do not assume SMTP is live.
11. Firebase project registration for `com.takka.app`, `google-services.json`, and `FIREBASE_SERVICE_ACCOUNT_JSON` on Render — after Google account unlock. See `docs/fcm-setup.md` and `docs/release-apk.md`.

---

## 9. Rules for agents

- **Never commit secrets** or `.env` files with real values. Never print `DATABASE_URL`, API keys, or vault contents.
- **One PR per task.** Keep diffs focused.
- **Do not merge** any PR without explicit owner approval.
- **No schema changes** (`prisma` models, migrations, `db push` against production) without owner approval.
- **Configurable values belong in the admin dashboard**, never hardcoded in source.
- Do not run further production media migrations without approval. Dry-run / preview first.
- Do not open WhatsApp, post to Facebook, email third parties, or publish anything without a fresh explicit approval naming the destination and the text.
- Do not put `prisma db push` back into the TAKKA-App build command.
- Batch work into one agent/PR when possible. Prefer the Auto model on Cursor when it is available. Warn before high-usage work.
- Deliver APKs as Drive links when asked.

---

## 10. Useful links and docs

- Clerk sessions: `docs/clerk-session.md`
- Demo data: `docs/demo-data.md`
- FCM: `docs/fcm-setup.md`
- Release APK / keystore / Play: `docs/release-apk.md`
- Env names: `admin/.env.example`
- R2 switch PR (merged, `6c7dd1c`): https://github.com/mhelaltrailer-droid/TAKKA/pull/7
- Initial HANDOFF PR (merged, `07fb862`): https://github.com/mhelaltrailer-droid/TAKKA/pull/8
- Latest distributed APK (v1.0.1 arm64) Drive file: https://drive.google.com/file/d/134nclV5mKZnXPygrvR49nvNbqQTLBjYf/view?usp=drivesdk

---

## 11. Launch log (external)

A running Arabic launch log (plan, decisions, completed steps) is maintained outside the repo:

- Local copy used by the owner's assistant: `/workspace/takka/takka-launch-log.md`
- Google Drive copy (keep in sync when the log changes): file id `1n1hcJxYkyx53ZMYbZ6VSFXgietoLd84_`

Related Drive docs (skim, do not treat as source of truth for code): marketing plan `1B34IbiA4jAPTS70fOfxhSNudeeMGy9O8`, delivery notes `1iPi5F1cMy4C48GSSRrFWfmd5Qy7wL9Ru`.
