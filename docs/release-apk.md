# Takka Android release APK

The sideload app id is **`com.takka.app`**. Release builds come from `takka_mobile/pubspec.yaml` (`version: x.y.z+build`). GitHub Actions builds the APKs, uploads them as workflow artifacts, and attaches them to a GitHub Release.

## What you must configure

1. **GitHub Actions secrets** (repository → Settings → Secrets and variables → Actions).
2. **A release keystore**, before the first APK you expect people to keep. Until those secrets exist, CI signs with the Android debug key and prints a warning. A later release key cannot update an app that was installed with the debug key; users would have to uninstall.
3. **Clerk Dashboard** Android package name `com.takka.app`, plus the SHA-256 of the certificate you actually ship.
4. **Render env vars** on `takka-app` when you want the in-app “فيه نسخة جديدة” prompt.
5. **Uninstall old builds.** Anything installed as `com.example.takka_mobile` is a different app. Android will not update it in place. Delete that install, then install `com.takka.app`. User data from the old id does not move.

iOS is unchanged in this work. Its bundle id is still `com.example.takkaMobile`.

---

## GitHub secrets

| Secret | Required | Value |
| --- | --- | --- |
| `CLERK_PUBLISHABLE_KEY` | Yes | The same publishable key as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (`pk_test_…` or `pk_live_…`). Not the Clerk secret key. |
| `PUSHER_KEY` | Yes | Same value as `NEXT_PUBLIC_PUSHER_KEY`. |
| `PUSHER_CLUSTER` | No | Defaults to `eu` when empty. |
| `TAKKA_API_BASE_URL` | No | Defaults to `https://takka-app.onrender.com` when empty. |
| `KEYSTORE_BASE64` | With the keystore | Base64 of the `.jks` file (see below). |
| `KEYSTORE_PASSWORD` | With the keystore | Store password. |
| `KEY_ALIAS` | With the keystore | Alias you passed to `keytool` (example: `takka`). |
| `KEY_PASSWORD` | With the keystore | Key password. |
| `GOOGLE_SERVICES_JSON` | No | Base64 of `google-services.json` for package `com.takka.app`. Empty means the APK still builds and FCM stays off. See `docs/fcm-setup.md`. |

The workflow fails if the Clerk or Pusher values are missing or still placeholders (`replace_me`, and similar). It also fails if only some of the four keystore secrets are set. If **none** of the keystore secrets are set, the build continues with the debug key and a warning.

Do not commit `dart_defines.json`, `key.properties`, or any `.jks` / `.keystore` file. They are gitignored.

## Create the release keystore

Run this once, on a machine you control. Pick passwords and store them somewhere you can open later (password manager plus an offline copy).

```bash
keytool -genkeypair -v \
  -keystore takka-release.jks \
  -storetype JKS \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias takka
```

`keytool` is in the JDK (`JAVA_HOME/bin`). Validity is about 27 years. Use the same alias (`takka`) as `KEY_ALIAS`.

Back up **both** `takka-release.jks` and the passwords. GitHub secrets cannot be read back after you save them. If you lose the keystore, every installed copy of `com.takka.app` must be uninstalled before a new key will install.

Base64 for `KEYSTORE_BASE64` (one line, no wrapping):

```bash
base64 -w 0 takka-release.jks
```

PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("takka-release.jks"))
```

Paste that string into the `KEYSTORE_BASE64` secret. Keep the `.jks` itself out of the repo.

Local release builds can use `takka_mobile/android/key.properties` instead of the env vars (this file is gitignored):

```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=takka
storeFile=C:/full/path/to/takka-release.jks
```

`storeFile` may be absolute, or relative to `takka_mobile/android/`. Env vars `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, and `KEY_PASSWORD` override the file when they are set (that is what CI uses).

SHA-256 of the release cert (add this in Clerk):

```bash
keytool -list -v -keystore takka-release.jks -alias takka
```

While CI is still on the debug key, the certificate is the Android debug keystore:

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Windows debug keystore: `%USERPROFILE%\.android\debug.keystore` (same alias and passwords).

## Clerk dashboard

The app does not hardcode its package name inside the passkey asset-link include. `takka_mobile/android/app/src/main/res/values/strings.xml` only points at Clerk’s hosted file:

`https://cuddly-porpoise-5788.clerk.accounts.dev/.well-known/assetlinks.json`

Clerk builds that file from the Android package name and SHA-256 fingerprints saved in the dashboard. After this id change, update Clerk or passkeys / App Links will fail verification.

1. Open the Clerk application that matches the publishable key baked into the APK.
2. Find the Android native app settings (Configure → Native applications, or the Android application section).
3. Set the package name to `com.takka.app`. Remove `com.example.takka_mobile` if it is still listed.
4. Add the SHA-256 fingerprint of the keystore that signs the APK you distribute (release key once it exists; debug key only while you are still shipping debug-signed APKs).
5. Open `https://cuddly-porpoise-5788.clerk.accounts.dev/.well-known/assetlinks.json` and confirm `package_name` is `com.takka.app` and the fingerprint matches `keytool -list -v`.
6. The HTTPS App Link host in `AndroidManifest.xml` stays the Clerk Frontend API host above. You do not change that host when you change the application id.

## Cut a release

1. Bump `takka_mobile/pubspec.yaml`:

   ```yaml
   version: 1.2.0+4
   ```

   `1.2.0` is the visible version. `4` is Android `versionCode` and the number the update prompt compares. It must increase for every APK you ship.

2. Commit and push that change to `main`.
3. Either:
   - Push a tag that matches the pubspec name: `git tag v1.2.0 && git push origin v1.2.0`.  
     `v1.2.0+4` is also accepted when `+4` matches the pubspec build. The workflow fails if the tag and `pubspec.yaml` disagree.
   - Or open GitHub → Actions → **Release APK** → Run workflow. That uses the pubspec version on the selected commit and publishes release `v1.2.0` (no `+build` in the tag).
4. Download the APKs from the workflow run (**Artifacts**) or from the GitHub Release.
5. On Render, set the env vars in the next section and redeploy if Render does not pick them up automatically. Point `MOBILE_APP_DOWNLOAD_URL` at the universal asset (simplest for kitchen owners) or the `arm64-v8a` asset.
6. Send the file:
   - `takka-1.2.0-4-arm64-v8a.apk` — most phones.
   - `takka-1.2.0-4-armeabi-v7a.apk` — older 32-bit phones.
   - `takka-1.2.0-4-universal.apk` — one file for both, larger.
   - `x86_64` is off unless you check **Also build an x86_64 APK** on a manual run. It is for emulators.

The workflow file is `.github/workflows/release-apk.yml`. It uses Flutter `3.44.9` (Dart 3.12.2, the SDK constraint in `pubspec.yaml`).

## Local builds

From `takka_mobile`, with `dart_defines.json` present (or `admin/.env` so the sync script can write it):

```bash
bash scripts/build_release_apk.sh
bash scripts/build_release_apk.sh --no-universal
bash scripts/build_release_apk.sh --x86_64
```

```powershell
powershell -File scripts/build_release_apk.ps1
powershell -File scripts/build_release_apk.ps1 -NoUniversal
powershell -File scripts/build_release_apk.ps1 -IncludeX86_64
```

Outputs land in `takka_mobile/build/app/outputs/flutter-apk/dist/`. `LATEST_APK_PATH.txt` points at the universal APK when it was built, otherwise the arm64 APK.

Do not run a bare `flutter build apk --release`. That omits the Clerk key.

## Render: in-app update prompt

`GET https://takka-app.onrender.com/api/mobile/app-version` reads only environment variables. No migration.

| Variable | Meaning |
| --- | --- |
| `MOBILE_APP_LATEST_VERSION` | Optional display text, `1.2.0`. |
| `MOBILE_APP_LATEST_BUILD` | Required. Integer build from pubspec (`+4` → `4`). |
| `MOBILE_APP_MIN_BUILD` | Optional. Installed builds **below** this get a blocking dialog. Defaults to no forced update when unset. |
| `MOBILE_APP_DOWNLOAD_URL` | Required `https://` link opened in the browser. |
| `MOBILE_APP_RELEASE_NOTES_AR` | Optional Arabic text inside the dialog. |

Example:

```
MOBILE_APP_LATEST_VERSION=1.2.0
MOBILE_APP_LATEST_BUILD=4
MOBILE_APP_MIN_BUILD=3
MOBILE_APP_DOWNLOAD_URL=https://github.com/<org>/<repo>/releases/download/v1.2.0/takka-1.2.0-4-universal.apk
MOBILE_APP_RELEASE_NOTES_AR=تحسينات في الطلبات.
```

The app checks on launch, and again when it returns to the foreground, at most once every 6 hours after a successful response. Optional updates can be dismissed for 24 hours («لاحقًا»). A build below the minimum cannot be dismissed. If the endpoint is down, the JSON is unusable, or the variables are unset, the app continues with no dialog.

Confirm with:

```bash
curl -sS https://takka-app.onrender.com/api/mobile/app-version
```

Unset variables look like `{"configured":false,"reason":"Mobile app update env vars are not set."}`.

---

# إصدار تطبيق تكة على أندرويد

معرّف التطبيق بقى **`com.takka.app`**. رقم النسخة بيتقرأ من `takka_mobile/pubspec.yaml` بالشكل `x.y.z+build`. GitHub Actions يبني ملفات الـ APK، يحطها في الـ artifacts، ويرفقها بـ GitHub Release.

## المطلوب منك

1. **أسرار GitHub Actions** (Settings → Secrets and variables → Actions).
2. **مفتاح توقيع الإصدار** قبل أول APK الناس هتفضّل مثبّتاه. من غير الأسرار دي، البناء بيمضي بمفتاح التجريب (debug) وبيطلع تحذير. مفتاح الإصدار بعد كده مش هيقدر يحدّث تطبيق اتثبت بمفتاح التجريب؛ لازم يتشال ويتثبت من جديد.
3. **لوحة Clerk**: اسم الحزمة `com.takka.app` وبصمة SHA-256 للشهادة اللي بتوزّع بيها فعلاً.
4. **متغيرات Render** على خدمة `takka-app` لما تحب رسالة «فيه نسخة جديدة» تظهر جوه التطبيق.
5. **امسح النسخ القديمة.** أي تثبيت باسم `com.example.takka_mobile` تطبيق تاني. أندرويد مش هيحدّثه فوق نفسه. امسحه الأول، وبعدين ثبّت `com.takka.app`. بيانات النسخة القديمة مش بتنتقل.

نسخة iOS متغيرتش. معرّفها لسه `com.example.takkaMobile`.

## أسرار GitHub

| السر | مطلوب؟ | القيمة |
| --- | --- | --- |
| `CLERK_PUBLISHABLE_KEY` | نعم | نفس مفتاح Clerk العام `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (`pk_test_…` أو `pk_live_…`). مش المفتاح السري. |
| `PUSHER_KEY` | نعم | نفس `NEXT_PUBLIC_PUSHER_KEY`. |
| `PUSHER_CLUSTER` | لا | لو فاضي يبقى `eu`. |
| `TAKKA_API_BASE_URL` | لا | لو فاضي يبقى `https://takka-app.onrender.com`. |
| `KEYSTORE_BASE64` | مع المفتاح | ملف الـ `.jks` بعد تحويله لـ Base64. |
| `KEYSTORE_PASSWORD` | مع المفتاح | كلمة سر المخزن. |
| `KEY_ALIAS` | مع المفتاح | الاسم اللي ادى لـ `keytool` (مثال: `takka`). |
| `KEY_PASSWORD` | مع المفتاح | كلمة سر المفتاح. |
| `GOOGLE_SERVICES_JSON` | لا | ملف `google-services.json` بعد تحويله لـ Base64، واسم الحزمة فيه لازم يكون `com.takka.app`. لو السر فاضي، الـ APK يتبني وإشعارات Firebase تفضل مقفولة. التفاصيل في `docs/fcm-setup.md`. |

البناء يفشل لو مفتاح Clerk أو Pusher ناقص أو لسه قيمة تجريبية زي `replace_me`. ويفشل كمان لو بعض أسرار المفتاح موجودة والباقي لأ. لو **الأربعة فاضيين**، البناء يكمل بمفتاح التجريب مع تحذير واضح.

مترفعش `dart_defines.json` ولا `key.properties` ولا أي ملف `.jks` أو `.keystore`. الملفات دي متجاهلة في git.

## إنشاء مفتاح التوقيع

نفّذ الأمر ده مرة واحدة على جهازك. احفظ كلمات السر في مدير كلمات سر ونسخة أوفلاين.

```bash
keytool -genkeypair -v \
  -keystore takka-release.jks \
  -storetype JKS \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias takka
```

`keytool` موجود مع الـ JDK. مدة الصلاحية حوالي ٢٧ سنة. استخدم نفس الاسم `takka` في السر `KEY_ALIAS`.

اعمل نسخة احتياطية من **الملف وكلمات السر**. أسرار GitHub مش بتتقري تاني بعد الحفظ. لو الملف ضاع، كل نسخة متثبتة من `com.takka.app` لازم تتشال قبل ما مفتاح جديد يشتغل.

تحويل الملف لـ Base64 (سطر واحد):

```bash
base64 -w 0 takka-release.jks
```

على PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("takka-release.jks"))
```

الصق الناتج في السر `KEYSTORE_BASE64`. سيّب ملف الـ `.jks` بره المستودع.

للبناء المحلي ممكن ملف `takka_mobile/android/key.properties` بدل متغيرات البيئة (الملف متجاهل في git):

```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=takka
storeFile=C:/full/path/to/takka-release.jks
```

المسار يا مطلق يا نسبي من `takka_mobile/android/`. متغيرات البيئة `KEYSTORE_BASE64` و `KEYSTORE_PASSWORD` و `KEY_ALIAS` و `KEY_PASSWORD` بتغلب الملف لو موجودة (كده CI بيشتغل).

بصمة SHA-256 لمفتاح الإصدار (تحطها في Clerk):

```bash
keytool -list -v -keystore takka-release.jks -alias takka
```

طول ما البناء لسه على مفتاح التجريب، الشهادة هي مفتاح أندرويد التجريبي:

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

على ويندوز: `%USERPROFILE%\.android\debug.keystore` (نفس الاسم وكلمات السر).

## لوحة Clerk

التطبيق مش كاتب اسم الحزمة جوه ملف روابط الأصول. الملف `takka_mobile/android/app/src/main/res/values/strings.xml` بس بيشير لملف Clerk:

`https://cuddly-porpoise-5788.clerk.accounts.dev/.well-known/assetlinks.json`

Clerk يكوّن الملف ده من اسم حزمة أندرويد وبصمات SHA-256 المحفوظة في اللوحة. بعد تغيير المعرّف لازم تحدّث Clerk، وإلا التحقق من مفاتيح المرور وروابط التطبيق هيفشل.

1. افتح تطبيق Clerk اللي يطابق المفتاح العام اللي جوه الـ APK.
2. إعدادات تطبيق أندرويد الأصلي (Configure → Native applications، أو قسم Android).
3. خلّي اسم الحزمة `com.takka.app`. شيل `com.example.takka_mobile` لو لسه موجود.
4. أضف بصمة SHA-256 لشهادة الـ APK اللي بتوزّعه (مفتاح الإصدار لما يبقى جاهز؛ مفتاح التجريب بس لو لسه بتوزّع APK ممضية بيه).
5. افتح الرابط فوق وتأكد إن `package_name` هو `com.takka.app` وإن البصمة مطابقة لـ `keytool -list -v`.
6. نطاق رابط التطبيق في `AndroidManifest.xml` يفضل نطاق Clerk Frontend API المكتوب فوق. مش محتاج تغيّره مع تغيير معرّف التطبيق.

## إصدار نسخة

1. عدّل `takka_mobile/pubspec.yaml`:

   ```yaml
   version: 1.2.0+4
   ```

   `1.2.0` الرقم الظاهر. `4` هو `versionCode` والرقم اللي رسالة التحديث بتقارن بيه. لازم يزيد مع كل APK يتوزّع.

2. اعمل commit وادفع التغيير على `main`.
3. بعدين يا:
   - تدفع تاج مطابق لاسم النسخة: `git tag v1.2.0 && git push origin v1.2.0`.  
     `v1.2.0+4` مقبول لو `+4` مطابق لرقم البناء في pubspec. الـ workflow يفشل لو التاج و`pubspec.yaml` مختلفين.
   - يا تفتح GitHub → Actions → **Release APK** → Run workflow. ده بياخد نسخة الـ pubspec على الـ commit المختار وينشر إصدار `v1.2.0`.
4. نزّل الملفات من تشغيل الـ workflow (**Artifacts**) أو من GitHub Release.
5. على Render حط المتغيرات اللي تحت، واعمل إعادة نشر لو الخدمة ماخدتش القيم لوحدها. خلّي `MOBILE_APP_DOWNLOAD_URL` يشير لملف universal (الأبسط لأصحاب المطابخ) أو ملف `arm64-v8a`.
6. ابعت الملف:
   - `takka-1.2.0-4-arm64-v8a.apk` لمعظم الموبايلات.
   - `takka-1.2.0-4-armeabi-v7a.apk` للموبايلات الأقدم ٣٢ بت.
   - `takka-1.2.0-4-universal.apk` ملف واحد للاتنين، وحجمه أكبر.
   - `x86_64` مش بيتبني إلا لو علّمت **Also build an x86_64 APK** في التشغيل اليدوي. ده للمحاكي.

ملف الـ workflow: `.github/workflows/release-apk.yml`. بيستخدم Flutter `3.44.9` (Dart 3.12.2، نفس قيد الـ SDK في `pubspec.yaml`).

## البناء المحلي

من مجلد `takka_mobile`، مع وجود `dart_defines.json` (أو `admin/.env` عشان سكربت المزامنة يكتبه):

```bash
bash scripts/build_release_apk.sh
bash scripts/build_release_apk.sh --no-universal
bash scripts/build_release_apk.sh --x86_64
```

```powershell
powershell -File scripts/build_release_apk.ps1
powershell -File scripts/build_release_apk.ps1 -NoUniversal
powershell -File scripts/build_release_apk.ps1 -IncludeX86_64
```

الملفات بتطلع في `takka_mobile/build/app/outputs/flutter-apk/dist/`. `LATEST_APK_PATH.txt` بيشير لملف universal لو اتبنى، وإلا لملف arm64.

متشغّلش `flutter build apk --release` لوحده. ده بيطلع التطبيق من غير مفتاح Clerk.

## Render: رسالة التحديث جوه التطبيق

`GET https://takka-app.onrender.com/api/mobile/app-version` بيقرأ متغيرات البيئة بس. مفيش تعديل على قاعدة البيانات.

| المتغير | المعنى |
| --- | --- |
| `MOBILE_APP_LATEST_VERSION` | نص اختياري يظهر للمستخدم، مثل `1.2.0`. |
| `MOBILE_APP_LATEST_BUILD` | مطلوب. رقم البناء من pubspec (`+4` يعني `4`). |
| `MOBILE_APP_MIN_BUILD` | اختياري. أي بناء **أقل** من الرقم ده تظهر له رسالة إجبارية متتقفلش. لو المتغير فاضي مفيش إجبار. |
| `MOBILE_APP_DOWNLOAD_URL` | مطلوب. رابط `https://` بيتفتح في المتصفح. |
| `MOBILE_APP_RELEASE_NOTES_AR` | نص عربي اختياري جوه الرسالة. |

مثال:

```
MOBILE_APP_LATEST_VERSION=1.2.0
MOBILE_APP_LATEST_BUILD=4
MOBILE_APP_MIN_BUILD=3
MOBILE_APP_DOWNLOAD_URL=https://github.com/<org>/<repo>/releases/download/v1.2.0/takka-1.2.0-4-universal.apk
MOBILE_APP_RELEASE_NOTES_AR=تحسينات في الطلبات.
```

التطبيق بيفحص عند الفتح، ومرة تانية لما يرجع للمقدمة، بحد أقصى مرة كل ٦ ساعات بعد رد ناجح. التحديث الاختياري يتأجل ٢٤ ساعة بزر «لاحقًا». البناء الأقل من الحد الأدنى مش بيتقفل. لو العنوان واقع، أو الرد مش مفهوم، أو المتغيرات مش متعينة، التطبيق يكمل من غير أي رسالة.

للتأكد:

```bash
curl -sS https://takka-app.onrender.com/api/mobile/app-version
```

لو المتغيرات فاضية الرد يبقى: `{"configured":false,"reason":"Mobile app update env vars are not set."}`.
