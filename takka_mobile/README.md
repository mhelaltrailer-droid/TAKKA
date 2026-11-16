# takka_mobile

Unified Flutter mobile app for `تكة`, serving both:
- `customer`
- `kitchen_owner`

The app now uses:
- `Clerk` for real authentication
- `POST /api/mobile/role` to persist the selected app role
- `GET /api/mobile/me` as a mobile-friendly session bootstrap endpoint

A user who has signed in stays signed in across app restarts. The client token is stored in application support (and secure storage), and the last role is cached so customer home or kitchen home opens without the sign-in or role screens. Clerk session lifetime and inactivity timeout still apply; set those in the dashboard using [`docs/clerk-session.md`](../docs/clerk-session.md).

## Run locally

Start the Next.js backend first from `admin`:

```bash
npm run dev
```

Then run the Flutter app with the required environment values:

```bash
flutter run --dart-define=CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key --dart-define=TAKKA_API_BASE_URL=http://10.0.2.2:3000
```

Or sync secrets once, then run with the local file:

```powershell
powershell -File scripts/sync_dart_defines.ps1
flutter run --dart-define-from-file=dart_defines.json
```

## Release APK / AAB (important)

**Never** build with bare `flutter build apk --release` — that omits the Clerk key and shows «مفتاح Clerk غير مضبوط».

Android application id: `com.takka.app`. Full release steps (GitHub secrets, keystore, Clerk package name, Render update env): [`docs/release-apk.md`](../docs/release-apk.md).

The APK scripts build split APKs (`arm64-v8a`, `armeabi-v7a`) and a universal APK. Add `-IncludeX86_64` / `--x86_64` for emulators, or `-NoUniversal` / `--no-universal` to skip the fat APK.

```powershell
powershell -File scripts/build_release_apk.ps1
powershell -File scripts/build_release_aab.ps1
```

```bash
bash scripts/build_release_apk.sh
```

- Local secrets live in `dart_defines.json` (gitignored).
- Template: `dart_defines.example.json`
- Output: `build/app/outputs/flutter-apk/dist/`
- Recommended path: `LATEST_APK_PATH.txt` (universal APK when it was built, otherwise arm64)
- AAB path: `LATEST_AAB_PATH.txt`

## Notes

- `10.0.2.2` is the Android emulator alias for your machine's localhost.
- If you run on Chrome or Windows, replace it with `http://localhost:3000`.
- If you run on a physical phone, replace it with your computer's local IP address.
- On Windows, `Developer Mode` should be enabled for Flutter plugins to work smoothly.
