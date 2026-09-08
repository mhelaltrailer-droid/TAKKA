# takka_mobile

Unified Flutter mobile app for `تكة`, serving both:
- `customer`
- `kitchen_owner`

The app now uses:
- `Clerk` for real authentication
- `POST /api/mobile/role` to persist the selected app role
- `GET /api/mobile/me` as a mobile-friendly session bootstrap endpoint

## Run locally

Start the Next.js backend first from `admin`:

```bash
npm run dev
```

Then run the Flutter app with the required environment values:

```bash
flutter run --dart-define=CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key --dart-define=TAKKA_API_BASE_URL=http://10.0.2.2:3000
```

## Notes

- `10.0.2.2` is the Android emulator alias for your machine's localhost.
- If you run on Chrome or Windows, replace it with `http://localhost:3000`.
- If you run on a physical phone, replace it with your computer's local IP address.
- On Windows, `Developer Mode` should be enabled for Flutter plugins to work smoothly.
