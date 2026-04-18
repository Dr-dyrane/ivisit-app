# Google Play Closed Testing

## Reviewer Access

Use this only for Google Play closed testing / app review.

- Email: `support@ivisit.ng`
- Code: `123456`
- App build profile: `staging`
- Supabase project: `dlwtcmhdzoklveihuhjf`
- Supabase Edge Function: `review-demo-auth`

## Flow

1. Open the app from the closed testing build.
2. Start the emergency map flow.
3. Choose transport and continue into `COMMIT_DETAILS`.
4. Enter `support@ivisit.ng`.
5. Enter code `123456`.
6. Continue the emergency request flow.

## Guardrails

- `support@ivisit.ng` must stay a `patient` profile.
- Do not use admin/personal Gmail accounts for Play review.
- The static review code is accepted only by `review-demo-auth`.
- The client never stores the static code as a login bypass.
- The Edge Function exchanges the static code for a real short-lived Supabase OTP, then the app verifies normally.

## Required Runtime Flags

Client build flag, enabled in `eas.json` for `staging`:

```text
EXPO_PUBLIC_REVIEW_DEMO_AUTH_ENABLED=true
EXPO_PUBLIC_REVIEW_DEMO_AUTH_EMAIL=support@ivisit.ng
```

Supabase Edge Function secrets:

```text
REVIEW_DEMO_AUTH_ENABLED=true
REVIEW_DEMO_AUTH_EMAIL=support@ivisit.ng
REVIEW_DEMO_AUTH_OTP=123456
```

## If The Code Changes

Update both places together:

1. Supabase secret `REVIEW_DEMO_AUTH_OTP`.
2. Google Play Console reviewer instructions.
3. This document and the emergency flow docs.

Deploy / update commands:

```bash
npx supabase secrets set REVIEW_DEMO_AUTH_ENABLED=true REVIEW_DEMO_AUTH_EMAIL=support@ivisit.ng REVIEW_DEMO_AUTH_OTP=123456 --project-ref dlwtcmhdzoklveihuhjf
npx supabase functions deploy review-demo-auth --project-ref dlwtcmhdzoklveihuhjf
```
