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
PUSHER_APP_ID=
NEXT_PUBLIC_PUSHER_KEY=
PUSHER_SECRET=
NEXT_PUBLIC_PUSHER_CLUSTER=eu
NEXT_PUBLIC_TAKKA_SURFACE=app

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

## After deploy
1. Open https://takka-app.onrender.com
2. Create account with phone like 01111989094
3. Verify email code
4. Choose customer or kitchen role
