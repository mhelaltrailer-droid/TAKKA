# Takka kitchen push (FCM)

Push is optional. Until the steps below are done, the Android app and the Render API keep working exactly as they do today: in-app alerts still use Pusher, and no Firebase secret is required to build.

الإشعارات الخارجية اختيارية. من غير الخطوات دي التطبيق والسيرفر يشتغلوا زي الأول، وتنبيه الطلب جوه التطبيق (Pusher) يفضل شغال.

اسم حزمة أندرويد في Firebase لازم يكون `com.takka.app`. متسجلش `com.example.takka_mobile`. أي تثبيت قديم بالاسم ده يتشال قبل تثبيت النسخة الجديدة.

## What you will create

- A free Firebase project
- An Android app whose package name is exactly `com.takka.app` (the application id in `takka_mobile/android/app/build.gradle.kts`)
- `takka_mobile/android/app/google-services.json` (do not commit it)
- A Firebase service account, stored only in Render env vars

## 1. Firebase project and Android app

1. Open https://console.firebase.google.com/ and create a project (Spark / free plan is enough). Google Analytics is optional.
2. Project settings → Your apps → Add app → Android.
3. Android package name: `com.takka.app`. Do not register `com.example.takka_mobile`. That id is no longer the app, and an old sideload of it must be uninstalled before installing `com.takka.app`.
4. Download `google-services.json`.
5. Put it here, and only here:

   `takka_mobile/android/app/google-services.json`

   Gradle applies the Google Services plugin only when that file exists. A missing file is fine: the APK still builds and push stays off. Do not commit a fake file.
6. Rebuild the APK (`bash scripts/build_release_apk.sh` or the PowerShell script). The kitchen app will then ask, in Arabic, for notification permission after login.

GitHub Actions can do step 5 for you. Base64 the file and save it as the secret `GOOGLE_SERVICES_JSON`:

```bash
base64 -w 0 takka_mobile/android/app/google-services.json
```

If that secret is empty, the Release APK workflow still builds and prints a warning. Push stays disabled in that APK.

## 2. Service account for the API

The phone receives messages. Render sends them.

1. Firebase console → Project settings → Service accounts.
2. Generate a new private key (JSON). Do not commit this file.
3. On the Render service `takka-app`, set **one** of these options.

**Option A — one variable (simplest)**

`FIREBASE_SERVICE_ACCOUNT_JSON` = the full JSON file contents (one value). The `private_key` inside Google's file already contains `\n` escapes. Paste it as-is.

**Option B — three variables**

| Variable | Example |
| --- | --- |
| `FIREBASE_PROJECT_ID` | `takka-prod` |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-xxxxx@takka-prod.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | the `private_key` value, with newlines written as `\n` |

4. Redeploy. The existing build command `prisma generate && prisma db push && next build` creates the new `DevicePushToken` table. That change only adds a table; it does not rewrite existing rows.

## 3. How to test

1. Install the new APK on a kitchen phone (Android 13+: allow notifications when the Arabic explanation appears).
2. Leave the app logged in as the kitchen, then swipe it away.
3. From another customer account, place an order.
4. The phone should show an Arabic system notification with sound. Tapping it opens the kitchen orders screen.
5. Approval / rejection, order status, and chat notifications use the same path. Customer taps open the order screen.

If the env vars or `google-services.json` are missing, step 4 does nothing and the order APIs still succeed. The in-app Pusher alert still plays while the kitchen app is open.

## Notes

- Notification channel id: `takka_alerts` (created by the app on startup).
- Tokens are stored per user and removed on logout, on token refresh replacement, and when FCM says the token is no longer valid.
- Do not put the service-account JSON or `google-services.json` in git.
- The Firebase Android app must use package `com.takka.app`. A `google-services.json` registered to `com.example.takka_mobile` will not match this build; CI rejects that file.
