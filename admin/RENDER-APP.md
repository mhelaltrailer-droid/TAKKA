# Deploying Takka App Web (customers + kitchens)
# Service name suggestion: takka-app
# Public URL: https://takka-app.onrender.com
#
# Keep the existing admin service on:
# https://takka-admin.onrender.com

## Render Web Service settings
- Repository: mhelaltrailer-droid/TAKKA
- Root Directory: admin
- Build Command: npm install && npm run build
- Start Command: npm run start
- Instance: Free

## Required env vars (same secrets as admin, plus surface)
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
UPLOADTHING_TOKEN=
# Optional but recommended so UploadThing callbacks hit the public app URL:
# UPLOADTHING_CALLBACK_URL=https://takka-app.onrender.com

PUSHER_APP_ID=
NEXT_PUBLIC_PUSHER_KEY=
PUSHER_SECRET=
NEXT_PUBLIC_PUSHER_CLUSTER=eu
NEXT_PUBLIC_TAKKA_SURFACE=app

## Optional: alert the team on a new /join-kitchen lead
# Primary = email (SMTP). Telegram + webhook are extras.
# If none are set, the lead is still saved and the admin "جديد" count still updates.
#
# Gmail App Password (requires 2-Step Verification on the Google account):
# 1. https://myaccount.google.com/security → turn on 2-Step Verification
# 2. https://myaccount.google.com/apppasswords → create a Mail app password
# 3. Set on the takka-app Render service:
# JOIN_KITCHEN_ALERT_EMAIL_TO=takkaapp.eg@gmail.com
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=465
# SMTP_USER=takkaapp.eg@gmail.com
# SMTP_PASS=<16-char app password>
# SMTP_FROM=تكة <takkaapp.eg@gmail.com>
#
# Optional extras:
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_CHAT_ID=
# JOIN_KITCHEN_ALERT_WEBHOOK_URL=
# JOIN_KITCHEN_ALERT_WEBHOOK_SECRET=

## Admin service must keep
NEXT_PUBLIC_TAKKA_SURFACE=admin

## Clerk Dashboard (important)
1. Disable Google / social sign-in providers.
2. Enable Email verification code.
3. Add allowed origins / redirect URLs for:
   - https://takka-app.onrender.com
   - https://takka-admin.onrender.com
4. Signup collects Egyptian phone + name + email.
   Verification code is sent to email.

## Mobile app update prompt (optional)

Public endpoint: `GET /api/mobile/app-version` (no database).

Set these on the **takka-app** Render service when you publish an APK.
If they are missing or invalid, the endpoint returns `configured: false` and the app shows nothing.

```
MOBILE_APP_LATEST_VERSION=1.0.0
MOBILE_APP_LATEST_BUILD=1
MOBILE_APP_MIN_BUILD=1
MOBILE_APP_DOWNLOAD_URL=https://github.com/<org>/<repo>/releases/download/v1.0.0/takka-1.0.0-1-universal.apk
MOBILE_APP_RELEASE_NOTES_AR=أول نسخة.
```

`MOBILE_APP_LATEST_BUILD` is the number after `+` in `takka_mobile/pubspec.yaml` (`1.0.0+1` → build `1`).
Builds below `MOBILE_APP_MIN_BUILD` get a forced update dialog. See `docs/release-apk.md`.

## After deploy
1. Open https://takka-app.onrender.com
2. Create account with phone like 01111989094
3. Verify email code
4. Choose customer or kitchen role
