# Vercel Web Deployment

## Goal

Deploy `ivisit-app` as the live patient web app at `app.ivisit.ng` while keeping:

- Expo native builds for iOS and Android
- one shared patient surface across native and web
- preview hospitals available for sponsor review until live provider coverage expands

## Required Vercel Environment Variables

Public client envs:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_GUMROAD_PRODUCT_URL`
- `EXPO_PUBLIC_DEBUG_MODE`
- `EXPO_PUBLIC_ENABLE_TRIAGE_AI`
- `EXPO_PUBLIC_WEB_APP_URL=https://app.ivisit.ng`

Build-time native config:

- `GOOGLE_MAPS_ANDROID_API_KEY`

Server-only envs:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`

Do not expose the service-role key as `EXPO_PUBLIC_*`.

## Supabase Auth Configuration

Set the Supabase Auth site URL to:

- `https://app.ivisit.ng`

Add these redirect URLs:

- `https://app.ivisit.ng/auth/callback`
- `https://app.ivisit.ng/auth/reset-password`
- `https://ivisit-app.vercel.app/auth/callback`
- `https://ivisit-app.vercel.app/auth/reset-password`
- Expo Go callback URLs already used for mobile preview

If you use Vercel preview deployments for auth testing, also allow:

- `https://*.vercel.app/auth/callback`
- `https://*.vercel.app/auth/reset-password`

## CLI Flow

Link the local repo:

```bash
vercel link --yes --scope drdyranes-projects --project ivisit-app
```

Add envs:

```bash
vercel env add EXPO_PUBLIC_SUPABASE_URL production
vercel env add EXPO_PUBLIC_SUPABASE_ANON_KEY production
vercel env add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY production
vercel env add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add EXPO_PUBLIC_GUMROAD_PRODUCT_URL production
vercel env add EXPO_PUBLIC_DEBUG_MODE production
vercel env add EXPO_PUBLIC_ENABLE_TRIAGE_AI production
vercel env add EXPO_PUBLIC_WEB_APP_URL production
vercel env add GOOGLE_MAPS_ANDROID_API_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

Repeat for `preview` if you want preview deployments to use live config.

Deploy:

```bash
vercel --prod
```

Attach the custom domain:

```bash
vercel domains add app.ivisit.ng ivisit-app
```

## Validation

Minimum checks before pointing marketing CTA to the web app:

```bash
npx expo export --platform web --output-dir dist-review
vercel build
```

Then verify:

- signed-out landing loads at `/`
- sign-in works on web
- `/auth/callback` completes correctly
- emergency screen renders on mobile and desktop widths
- map loads with the configured Google Maps web key
- preview hospitals remain available for sponsor review
