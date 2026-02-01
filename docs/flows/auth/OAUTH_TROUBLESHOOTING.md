# OAuth Troubleshooting Guide

## Overview

This document covers common OAuth authentication issues in the iVisit app across different platforms:
- **Expo Go (iOS)**
- **Expo Go (Android)**
- **Production APK/AAB**

## OAuth Flow Architecture

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OAuth Flow Diagram                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. User taps "Sign in with Google"                                         │
│  2. Supabase generates OAuth URL with redirect_to parameter                 │
│  3. WebBrowser.openAuthSessionAsync opens the OAuth URL                     │
│  4. User authenticates with Google                                          │
│  5. Google redirects to Supabase                                            │
│  6. Supabase redirects to our app's redirect URL                            │
│  7. Deep link handler catches the redirect and processes auth               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key URLs

| Platform | Supabase Redirect URL | WebBrowser Return URL |
|----------|----------------------|----------------------|
| Expo Go iOS | `exp://192.168.x.x:8081/--/auth/callback` | `ivisit://auth/callback` |
| Expo Go Android | `exp://192.168.x.x:8081/--/auth/callback` | `exp://192.168.x.x:8081/--/auth/callback` |
| Production (iOS/Android) | `ivisit://auth/callback` | `ivisit://auth/callback` |

### Why Different URLs Per Platform?

1. **Supabase Redirect URL** (`Linking.createURL()`): This is where Supabase actually redirects after OAuth
   - Expo Go: Uses `exp://` scheme
   - Production: Uses `ivisit://` scheme

2. **WebBrowser Return URL**: This tells WebBrowser when to close
   - **iOS**: Uses `ivisit://auth/callback` - Safari closes when it detects this scheme, and the deep link handler catches the actual `exp://` redirect
   - **Android Expo Go**: Must use the ACTUAL `exp://` URL - Chrome Custom Tabs requires exact URL match to close properly
   - **Android Production**: Uses `ivisit://auth/callback` - matches the Supabase redirect

## Supabase Redirect URL Configuration

### Required URLs in Supabase Dashboard

Go to **Authentication → URL Configuration → Redirect URLs** and add:

```
# Production
ivisit://auth/callback

# Expo Go (wildcards for different IPs)
exp://*/--/auth/callback
exp://192.168.0.*/--/auth/callback
exp://192.168.1.*/--/auth/callback
exp://127.0.0.1:8081/--/auth/callback
exp://localhost:8081/--/auth/callback

# Web (if applicable)
http://localhost:3000/auth/callback
https://console.ivisit.ng/auth/callback
```

## Common Issues & Solutions

### 1. iOS: "Safari cannot open invalid address"

**Symptoms:**
- Safari shows "Safari cannot open invalid address" error
- OAuth flow doesn't complete

**Cause:**
- Using `exp://` URL as WebBrowser return URL doesn't work reliably on iOS

**Solution:**
Use hardcoded `ivisit://auth/callback` as the WebBrowser return URL:

```javascript
const browserReturnUrl = "ivisit://auth/callback";
const result = await WebBrowser.openAuthSessionAsync(data.url, browserReturnUrl, options);
```

### 2. Android Expo Go: Browser Gets Stuck / Doesn't Redirect Back

**Symptoms:**
- Browser opens and auth completes with Google
- Browser doesn't close after authentication
- User is stuck on the browser/redirect page

**Cause:**
- Chrome Custom Tabs on Android requires the WebBrowser return URL to **exactly match** the redirect URL
- Using `ivisit://` as return URL doesn't work because Supabase redirects to `exp://` in Expo Go
- `createTask: true` (default) opens browser in a separate task which can cause issues

**Solution:**
For Android Expo Go, use the actual `exp://` redirect URL:

```javascript
const isExpoGo = Constants.appOwnership === "expo";
const isAndroid = Platform.OS === "android";

let browserReturnUrl;
if (isAndroid && isExpoGo) {
    // For Android Expo Go, use the actual exp:// URL that Supabase will redirect to
    browserReturnUrl = Linking.createURL("auth/callback");
} else {
    // For iOS (all) and Android Production, use custom scheme
    browserReturnUrl = "ivisit://auth/callback";
}

const browserOptions = {
    preferEphemeralSession: false,
    ...(Platform.OS === "android" && {
        createTask: false,      // Keep browser in same task as app
        showInRecents: false,   // Don't show separate entry in recents
    }),
};
```

### 3. Android: Google App Intercepts OAuth URL

**Symptoms:**
- Instead of Chrome Custom Tabs, the Google app opens
- After auth, user stays in Google app instead of returning to iVisit

**Solution:**
Force Chrome Custom Tabs by specifying `preferredBrowserPackage`:

```javascript
if (Platform.OS === "android") {
    const { preferredBrowserPackage } = await WebBrowser.getCustomTabsSupportingBrowsersAsync();
    // Use preferredBrowserPackage in openBrowserAsync if needed
}
```

### 4. Session Not Established After OAuth

**Symptoms:**
- Browser closes properly
- User is not logged in
- No error message shown

**Cause:**
- Deep link handler didn't catch the redirect
- PKCE code exchange failed

**Solution:**
The hook includes fallback logic to check session after cancel/dismiss:

```javascript
} else if (result.type === "cancel" || result.type === "dismiss") {
    // Check if deep link handler already processed auth
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        // Auth was successful via deep link
        await login(user);
        return { success: true };
    }
}
```

## Platform-Specific Options Reference

### WebBrowser.openAuthSessionAsync Options

| Option | Platform | Default | Description |
|--------|----------|---------|-------------|
| `createTask` | Android | `true` | If `false`, keeps browser in same task as app |
| `showInRecents` | Android | `false` | Show browser in Android recents/multitasking |
| `preferEphemeralSession` | iOS | `false` | Don't share cookies with Safari |
| `preferredBrowserPackage` | Android | - | Force specific browser for Custom Tabs |

## Debugging Tips

### Enable Logging

The OAuth hook includes detailed logging. Check console for:

```
[useSocialAuth] Supabase OAuth URL: https://...
[useSocialAuth] Browser return URL: ivisit://auth/callback
[useSocialAuth] Browser options: { createTask: false, ... }
[useSocialAuth] WebBrowser result: { type: "success" | "cancel" | "dismiss", ... }
[DeepLink] Received URL: exp://192.168.x.x:8081/--/auth/callback?code=...
```

### Check Your IP Address

If using Expo Go, ensure your current IP is whitelisted in Supabase:

```bash
# Find your current IP
ipconfig getifaddr en0  # macOS
ipconfig  # Windows
```

Add `exp://YOUR_IP:8081/--/auth/callback` to Supabase Redirect URLs.

## Files Reference

| File | Purpose |
|------|---------|
| `hooks/auth/useSocialAuth.js` | OAuth hook with platform-specific handling |
| `app/_layout.js` | Deep link handler for OAuth callbacks |
| `services/authService.js` | Supabase auth service with PKCE support |
| `app.json` | URL scheme configuration (`ivisit://`) |

