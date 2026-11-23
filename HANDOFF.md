# HANDOFF.md — Takka (تكة)

This file is the onboarding brief for any coding agent (Claude, Cursor, etc.) continuing work on Takka. Read it before changing code. Do **not** ask the owner questions this document already answers. Write code comments and PRs in English. When you talk to the owner, use Egyptian Arabic.

آخر تحديث: 23 نوفمبر 2026 (Africa/Cairo, UTC+2)

---

## 1. What Takka is

Takka (تكة) is a marketplace for homemade food in **Obour City (مدينة العبور), Egypt**. Home kitchens sell to neighbors. Brand colors: orange `#E8742A`, terracotta `#B3541E`, cream `#F6EDE0`.

Current phase: recruit **10–20 home kitchens**. Customers get the app from Google Play later. Kitchens currently use a temporary APK (`com.takka.app`, version `1.0.1+2`). That APK already includes reorder («اطلب تاني»), FCM scaffolding, and the complaint flow. Marketing is organic only (no paid ads).

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

- **Mobile:** Flutter, `clerk_flutter` `0.0.18-beta`, Pusher, Firebase Cloud Messaging, `flutter_map` / geolocator, image_picker. APK **1.0.1** already ships reorder («اطلب تاني»), FCM scaffolding (the Firebase project and Render vars are still pending — see §8), and the complaint flow.
- **Web + API:** Next.js `16.3.4`, React 19, Prisma `^6.16.3`, Clerk (`@clerk/nextjs`), Pusher, Cloudflare R2 for media (UploadThing still configured until a few new uploads are tested), nodemailer, firebase-admin, Zod, Tailwind 4. Node `>=20`.
- **Auth:** Clerk (currently in **development** mode). Sessions: **365-day** maximum lifetime, **inactivity timeout disabled** (applied in the Clerk dashboard on 2026-11-18). Details: `docs/clerk-session.md`. Email confirmation stays on email for now (SMS costs money). Admin login works with a Clerk **email code**. There is no Google sign-in option on the admin page. Vault entry `5270388` (Takka admin login) currently has the **wrong password**; the owner should edit or delete that entry. Do not print the password.
- **Realtime:** Pusher.
- **Database:** **Neon PostgreSQL** (not a Render database). PostgreSQL 18.x. Prisma schema: `admin/prisma/schema.prisma`.
- **Media today (main):** Cloudflare R2, bucket `takka-media`. UploadThing remains configured (`UPLOADTHING_TOKEN` is still set) until a few new uploads have been tested; then the owner can remove it.
- **Push:** FCM when Firebase is configured; in-app Pusher notifications still work without it. See `docs/fcm-setup.md`.

### Prisma models (current)

`User`, `Region`, `CustomerAddress`, `Kitchen`, `KitchenViewEvent`, `KitchenDocument`, `KitchenGalleryImage`, `KitchenPaymentMethod`, `MenuItem`, `FlashOffer`, `MenuItemSize`, `Order`, `OrderItem`, `DepositProof`, `OrderMessage`, `OrderIssue`, `Review`, `AdminAction`, `Notification`, `DevicePushToken`, `PromoBanner`, `FoodCategory`, `KitchenJoinLead`, `KitchenOrderPolicy`, `KitchenSuspensionRecord`.

Enums include `UserRole`, `ApprovalStatus`, `AvailabilityStatus` (`OPEN`, `BUSY`, `CLOSED`), `KitchenSuspensionLevel` (`LEVEL_1`, `LEVEL_2`), `KitchenResponseKind`, `DeliveryType`, `OrderReadiness`, `OrderStatus`, `PaymentType`, and others in the same schema file. A `DeliveryType` enum already exists; a full courier/delivery feature is **not** built yet (see decisions and Next steps).

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

## 7. Decisions (especially 2026-11-18 and 2026-11-19)

- Database is on **Neon**, not Render. Render is only for app hosting / URLs.
- Stay on the **old Render account**. New-account migration is postponed until a working card is available.
- **Delivery / courier** will be built **inside Takka**, not as a separate prototype. Implementation has **not** started. Decisions as of 19 Nov 2026:
  - Couriers are freelance **«مندوب تكة»**: the kitchen requests a courier when the food is ready, and the nearest courier accepts.
  - The courier is a **role inside the same Takka Flutter app** (one Play app with customer, kitchen, and courier roles), built from scratch. It is not a separate app, not a mobile web page, and not the old prototype.
  - Fee is based on **road distance** from the kitchen location to the client location, using a free routing service such as **OSRM** (not a straight-line distance, and not Google Maps for v1).
  - Starting per-km tiers (all editable in the admin dashboard): **10 EGP/km for 0–3 km**, **7 EGP/km for 3–6 km**, **5 EGP/km for 6–10 km**, and **3.5 EGP/km beyond 10 km** as the floor.
  - **Customer self-pickup** stays a core option.
  - Still open: whether tracking is a **live map** of the courier or **order-status stages** only (accepted, preparing, out, delivered). Stages are suggested for v1.
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
- **Deposits are not a conflict with the 22 Nov 2026 competitor notes.** Takka already records transfer deposits on `DepositProof`. In those notes, «cash outside the app» means delivery/courier money only, not the deposit. See `docs/replica/summary.md`.

Older product decisions and marketing rules are in the launch log (see §11) and the root planning markdown files.

---

## 7.1 Kitchen availability, acceptance timeout, and suspension (DECIDED 2026-11-22)

Decided and in this PR (do not treat it as an open proposal). Values below are the seeded defaults. After the first read they live in `KitchenOrderPolicy` (id `default`) and are edited at `/dashboard/admin/kitchen-policy`. Do not hardcode replacements in app code.

- `AvailabilityStatus`: `OPEN`, `BUSY`, `CLOSED`. The kitchen app (web dashboard and Flutter) has an Open / Busy / Closed selector. **Busy does not expire**; the kitchen changes it manually.
- Customers see Busy kitchens labelled مشغول and cannot order. Closed kitchens cannot be ordered from either. Discovery still lists Open and Busy (and a suspended kitchen, shown as Busy). Closed stays off the browse list. Order creation rejects Busy, Closed, and suspended kitchens on the server.
- If a kitchen does not accept or explicitly reject a new order within **10 minutes**, the order is auto-cancelled as `CANCELLED_BEFORE_DEPOSIT` with `cancelReason = KITCHEN_NO_RESPONSE`. The customer notification and order screen use the saved message, default: «المطبخ غير جاهز لاستقبال طلبك الآن، حاول في وقت لاحق». An explicit kitchen reject is `REJECTED_BY_KITCHEN` plus a stored `kitchenRejectReason` and does **not** count. Customer cancels do not count.
- Only no-response auto-cancels count. Suspend on either rolling window: **3 in 24 hours (level 1)** or **20 in 90 days (level 2)**. If both are hit, level 2 wins. Busy/Closed kitchens receive no new orders, so nothing new counts while they stay in those states.
- **Level 1** notifies the kitchen with the saved text (default mentions the 3/24h case and tells them to use Busy, then tap «فهمت»). Tapping «فهمت» (or marking that warning read) lifts it. **Level 2** uses its own saved text (default says Takka will review and contact them). Reading it does **not** lift it. Only admin **إعادة التفعيل** lifts level 2. Both levels look **Busy** to customers, not Closed.
- Each suspension is a `KitchenSuspensionRecord` (level, reason, start, end, how it ended: kitchen «فهمت», admin reactivate and which user, or upgraded to level 2). `AdminAction` also logs `KITCHEN_SUSPENDED` / `KITCHEN_REACTIVATED`.
- Accept/reject writes durable `kitchenRespondedAt` and `kitchenResponse` so later status changes do not erase the decision. Admin audit: `/dashboard/admin/kitchen-performance` (sortable overview) and `/dashboard/admin/kitchens/[id]/audit` (date range, counts, acceptance rate, average response, ratings, complaints, suspension history).

**How the timeout runs on Render.** No extra service and no required env var. `GET /api/health` awaits the sweep. UptimeRobot already pings that about every 5 minutes, which also keeps the free web service awake, so a timed-out order is cancelled on the next ping after the deadline (worst case about timeout + 5 minutes). The same sweep runs when a kitchen opens its profile or orders, when a customer opens orders, and when an order is created. Optional `GET` or `POST /api/cron/kitchen-acceptance` runs it too. If `CRON_SECRET` is set, that route requires header `x-cron-secret` or `Authorization: Bearer <secret>`. The health sweep does not use the secret. TAKKA-admin still owns `prisma db push`; do not add it back to TAKKA-App. The schema change is additive for `db push`: new enum values are not used as column defaults in the same change, new order/kitchen columns are nullable, and `KitchenOrderPolicy` / `KitchenSuspensionRecord` are new tables.

---

## 7.2 Order history cursor pagination (2026-11-23)

`GET /api/orders/my` and `GET /api/kitchen/orders` accept optional `cursor` (order id) and `limit` (default 20, max 50). Response is always `{ orders, nextCursor, hasMore }` — the same `orders` key Flutter already reads, so old builds stay compatible; without `cursor`/`limit` a safety cap of 50 applies. Kitchen lists always include **all active** orders on the first page and paginate only completed/cancelled/rejected history. Helper: `admin/src/lib/order-cursor-pagination.ts`. Web `/dashboard/orders` and Flutter `my_orders_screen` / `kitchen_orders_screen` follow the same rule.

---

## 8. Next steps

Do not start the heavy build items without the owner. Warn before any high-usage request. Give a usage-size estimate and wait for approval before writing delivery code. Future proposals that are not yet approved live in §8.1.

1. **Delivery (discussion, then estimate, then approval before build):** the courier model, in-app courier role, distance-based fees, admin-editable settings, and self-pickup are decided (see §7). Still open: live map vs status stages (accepted, preparing, out, delivered). Stages are suggested for v1.
2. **Cursor cloud Environment** for this repo.
3. **Facebook group** for Obour / kitchen recruitment (content only with owner approval; agents must not post).
4. **Real release keystore** (see `docs/release-apk.md`). Current distribution is a temporary APK.
5. **Custom domain + Clerk production** instance. Also plan how kitchens that signed up on the Clerk development instance are preserved.
6. **Google Play** launch (customers). Play Console signup fee is a later owner step.
7. Owner should fix or delete vault entry `5270388` (Takka admin login has the wrong password). Admin login currently works via Clerk email code.
8. Package «قِدرة الحي» (weekly menu, limited portions + cutoff, pickup windows, group cook) — discussion only, not implemented. If the owner writes that phrase, bring up the four proposals. Details are in the launch log.
9. Still open product questions: commission vs subscription, cancellation / deposit **refund** policy, hygiene requirements before activating a kitchen. Taking a deposit is not itself a conflict with the 22 Nov 2026 notes: Takka already stores `DepositProof` deposits, and «cash outside the app» in those notes means delivery/courier money only (`docs/replica/summary.md`).
10. Gmail 2-Step Verification / App Password for join-kitchen alert email was still locked as of 2026-11-16; do not assume SMTP is live.
11. Firebase project registration for `com.takka.app`, `google-services.json`, and `FIREBASE_SERVICE_ACCOUNT_JSON` on Render — after Google account unlock. FCM scaffolding is already in APK 1.0.1. See `docs/fcm-setup.md` and `docs/release-apk.md`.

---

## 8.1 Future proposals (to be discussed, not approved)

These are **proposals**, not decisions. They do not override §7, §8, or §9. Agents must get the owner's approval before starting any phase, and must not start anything that touches production, secrets, or the schema without a fresh approval. Originally titled "Suggested roadmap (proposed 2026-11-19, not yet approved)".

**Phase 1: Unblock current work**

1. **R2 rollout — done (18 Nov 2026).** Env vars are on both services, PR #7 is merged (`6c7dd1c`), and the image migration finished (2 copied, 2 database links updated, 0 failed). Keep `UPLOADTHING_TOKEN` until a few new uploads have been tested (see §6).
2. **Real release keystore** before distributing any new APK to kitchens. Changing the signing key later forces kitchens to uninstall and reinstall. Back up the keystore in the owner's vault; if it is lost, the app cannot be updated. See `docs/release-apk.md`.
3. **Join-kitchen alerts without waiting on Gmail:** the Gmail App Password is still locked (§8 item 10). Use the Telegram or webhook option already documented in `admin/.env.example`, or another email provider.
4. **FCM push notifications** (§8 item 11): scaffolding is already in APK 1.0.1; what remains is the Firebase project, `google-services.json`, and Render vars so kitchens hear about new orders even when the app is closed. Pusher alone does not cover that. See `docs/fcm-setup.md`.

**Phase 2: Product decisions before the first real order**

- Commission vs subscription. One option is a free period first, then pick the number after seeing real order volume.
- Cancellation and deposit refund policy, written clearly. This is the first thing likely to cause a dispute.
- Hygiene requirements before activating a kitchen (short checklist: kitchen photos, health certificate if available, consent to a visit).

**Phase 3: Limited pilot**

- Start with **3–5 kitchens in one neighborhood**, not 20 at once.
- Test the full cycle end to end: order → deposit → preparation → pickup → review.
- Run `npm run seed:demo:remove` before any real customer enters (see `docs/demo-data.md`).
- Collect what blocked each kitchen in the app and fix it before expanding.

**Phase 4: Prepare the customer launch**

- Clerk production instance (needs the custom domain; see §8 item 5).
- Privacy policy and terms of use (Google Play requires them).
- Play Console registration. Check Google's current testing requirements for new developer accounts before fixing a launch date.
- Error monitoring on web and mobile (for example Sentry, which has a free tier).
- Move off the Render free plan before real customers arrive: free services sleep, so the first request after idle is slow. Acceptable for the pilot, not for launch. Needs a working payment card (§4, §7).

**Phase 5: Growth**

- **Delivery / courier inside Takka** — design is decided in §7; implementation has not started and still needs a usage-size estimate and owner approval before any build. The only open product question is live map vs status stages (stages suggested for v1).
- «قِدرة الحي» package, once the core flow is proven.
- Online payment if volume grows.

**Parallel technical hygiene (small, one PR each)**

- Add a root `README.md` (the repo is public for kitchen recruitment).
- Add a GitHub Action that runs lint and build on every PR. The only existing workflow is `release-apk.yml`.
- Copy the launch log into `docs/` so a new agent can read it without Drive access (see §11).
- Enable regular Neon backups, not only before the R2 migration (the one-time R2 migration is already done).
- Consider whether the public repo should expose the Cloudflare account ID and public bucket URL in §6 (not secrets, but they could be removed if the repo stays public).

**Order acceptance timeout** was decided on 2026-11-22 and moved out of this proposal list into §7.1 (in PR).

**Additional proposals (added 2026-11-19, also not approved)**

Technical:

- **Replace `prisma db push` with `prisma migrate` for production.** Today every TAKKA-admin deploy runs `db push` against the live Neon database. That is fine early on, but once real data exists a schema change can silently drop a column or table, and there is no migration history. Move to `prisma migrate` with `migrate deploy` in the build **before the first real customer**. This is a schema/build change, so it needs explicit owner approval (§9), and the TAKKA-App build must still never run `db push` or any migration (§4).
- **Do not rely on the `r2.dev` public URL for production.** Cloudflare treats `r2.dev` as a development endpoint and may rate-limit it. Plan to attach the bucket to a custom domain, which is one more reason to buy the domain (§8 item 5). Check Cloudflare's current docs before deciding.
- **Enable repository protection** (the repo is public): GitHub secret scanning with push protection, and Dependabot security updates. Owner action in the repo settings.
- **Add a staging environment.** Neon supports database **branches**, so schema changes can be rehearsed on a branch copy before touching production. Needs owner approval before creating any new Neon resources.

Product / operations:

- **Deposit proof verification.** Deposits are paid by transfer and confirmed through `DepositProof` images, so fake or reused screenshots are possible. Require the kitchen to confirm receipt manually before the order starts, and flag an image that was already uploaded for another order. Needs a dedicated PR.
- **Solve the cold start (kitchens vs customers).** Kitchens with no customers lose interest quickly. Before launch, collect a waitlist of Obour customers (Facebook group, a simple form) and have each kitchen bring its first customers from people it already knows. Give each kitchen its own **link and QR code** for its page to share. Agents must not post or send anything without approval (§9).
- **Kitchen onboarding and support.** Most home kitchens are not tech-savvy, and a bad first experience can make them leave. Plan a short Arabic video (about 2 minutes) showing how to receive an order, a clear WhatsApp support number (`SUPPORT_WHATSAPP_NUMBER`), and weekly follow-up during the first month.

Metrics:

- **Track four numbers from day one:** active kitchens, orders per kitchen per week, repeat-customer rate, and average time to accept an order. Add an analytics tool (for example Firebase Analytics or PostHog) rather than guessing. Check privacy implications before collecting customer data.

Timing:

- **Ramadan 2027 is an opportunity.** It is expected to start around early to mid February 2027 (confirm the exact date), and demand for homemade food typically rises during it. If the pilot (Phase 3) finishes a few weeks earlier, Takka can enter the season with real experience. Treat this as a target to plan toward, not a commitment.

Legal:

- **Check legal requirements before public launch.** Selling home-cooked food in Egypt may require a license or registration (for example with the food safety authority or the local district office), and customer phone numbers and addresses fall under Egypt's personal data protection law. The owner should confirm with a lawyer or the relevant authority. Agents must not present anything in the app, marketing, or join copy as legal compliance advice.

**Operations and product proposals, round 2 (added 2026-11-19, also not approved)**

These concern how kitchens and customers work together inside the app. None of them may be started without the owner's approval, and each should be its own PR (§9).

Delivery (discussion points only; they must not conflict with the §7 decisions):

The following are already **decided** in §7 and are not open proposals: freelance «مندوب تكة» couriers (the kitchen requests a courier when the food is ready; the nearest courier accepts); courier as a role inside the same Takka Flutter app (one Play app, built from scratch — not a separate app, not a mobile web page, and not the old prototype); fee by road distance (OSRM, admin-editable tiers in §7); customer self-pickup remains a core option. Implementation has not started. Still open: live map vs status stages (stages suggested for v1).

Remaining discussion points:

- **Pickup** stays a core option and can be used in the pilot (`DeliveryType` already exists in §3) even before the courier flow is built.
- **Operational responsibility (still open):** who is responsible for late, cold, or spilled orders? These answers should be written before any delivery code ships.

One account with multiple roles (proposal, needs a decision before the user base grows):

- Many people in Obour will be both a customer and a kitchen. Prefer **one account that can hold both roles** over two separate logins (two emails, two confirmations, duplicate-person confusion).
- **Apply to become a kitchen from inside the customer account** and pass the normal approval review. The person stays a customer until the kitchen is approved.
- Add a clear **switch between customer mode and kitchen mode**, each with its own screens and notifications.
- **A kitchen must not be able to order from itself** (prevents fake reviews).
- If a kitchen is suspended or deleted, the customer account and its order history stay intact.
- **Verify first:** check in `admin/prisma/schema.prisma` how `UserRole` and `Kitchen` relate to `User`. If role is a single value on the user, this needs a schema change, which requires owner approval (§9). Doing it early is cheaper than after many real users exist.

For kitchens:

- **Loud, repeating sound alert** for new orders. Home kitchens are busy, and a missed order damages trust.
- **Open/closed toggle, working hours, and temporary pause**, so nobody orders when the kitchen is unavailable.
- **Preparation time per item** and a **daily cap on orders**, to prevent overload. This also supports the «قِدرة الحي» package.
- **Quick-reply buttons** in order chat (for example "ready", "running 15 minutes late").

For customers:

- **Reorder in one tap** is already shipped in APK 1.0.1 as «اطلب تاني». **Favorites** are still a proposal.
- **Scheduled orders** ("tomorrow at 2 PM"), which fit homemade food well.
- **Item details:** ingredients, allergens, portion size.
- **Reviews only after a completed order**, with the kitchen able to reply.

Trust and payment:

- **Delivery/pickup confirmation code** (for example 4 digits) instead of a plain "done" tap, to reduce disputes.
- **Selective deposits:** require a deposit for large orders, scheduled orders, or new customers, and allow cash on pickup for small orders. A deposit on every order may make customers leave. This depends on the open cancellation/deposit policy in §8 item 9.
- **No-show tracking:** after repeated no-shows, require a deposit from that customer.
- **A stated time limit for resolving complaints** (for example 24 hours) and a written refund policy. The complaint flow itself is already in APK 1.0.1.

Suggested priority if only five are chosen: (1) sound alert plus open/closed and working hours, (2) delivery confirmation code, (3) selective deposits, (4) one account with multiple roles, (5) scheduled orders.

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

- Competitor notes summary (22 Nov 2026): `docs/replica/summary.md`
- Kitchen order policy and audit (decided 22 Nov 2026, in PR): §7.1
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
