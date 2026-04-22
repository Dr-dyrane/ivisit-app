import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { authService } from '../../services/authService';
import { database, StorageKeys } from '../../database';
import { useAuth } from '../../contexts/AuthContext';

const PUBLIC_MAP_ROUTE = '/(auth)/map';
const CALLBACK_PAGE_DEDUP_WINDOW_MS = 8000;
let inFlightCallbackPageKey = null;
let inFlightCallbackPagePromise = null;
let lastCompletedCallbackPageKey = null;
let lastCompletedCallbackPageAt = 0;

function normalizePublicMapRoute(route) {
  if (route === '/(auth)/request-help') return PUBLIC_MAP_ROUTE;
  if (route === '/(auth)/map') return PUBLIC_MAP_ROUTE;
  if (route === '/(auth)/map-loading') return PUBLIC_MAP_ROUTE;
  if (route === '/map' || route === '/map-loading' || route === '/request-help') {
    return PUBLIC_MAP_ROUTE;
  }
  return null;
}

function readCallbackParams(currentUrl, fallbackParams = {}) {
  const fallback = {
    token: fallbackParams?.token || null,
    user: fallbackParams?.user || null,
    error: fallbackParams?.error || null,
    code: fallbackParams?.code || null,
    accessToken: fallbackParams?.accessToken || null,
    refreshToken: fallbackParams?.refreshToken || null,
  };

  if (!currentUrl) {
    return fallback;
  }

  try {
    const url = new URL(currentUrl);
    const hashParams = new URLSearchParams(
      url.hash?.startsWith('#') ? url.hash.slice(1) : url.hash || ''
    );

    return {
      token: url.searchParams.get('token') || hashParams.get('token') || fallback.token,
      user: url.searchParams.get('user') || hashParams.get('user') || fallback.user,
      error: url.searchParams.get('error') || hashParams.get('error') || fallback.error,
      code: url.searchParams.get('code') || hashParams.get('code') || fallback.code,
      accessToken:
        url.searchParams.get('access_token') ||
        hashParams.get('access_token') ||
        fallback.accessToken,
      refreshToken:
        url.searchParams.get('refresh_token') ||
        hashParams.get('refresh_token') ||
        fallback.refreshToken,
    };
  } catch (parseError) {
    const parsedUrl = Linking.parse(currentUrl);
    const queryParams = parsedUrl?.queryParams || {};
    return {
      token: queryParams?.token || fallback.token,
      user: queryParams?.user || fallback.user,
      error: queryParams?.error || fallback.error,
      code: queryParams?.code || fallback.code,
      accessToken: queryParams?.access_token || fallback.accessToken,
      refreshToken: queryParams?.refresh_token || fallback.refreshToken,
    };
  }
}

function buildCallbackPageKey(currentUrl, fallbackParams = {}) {
  if (currentUrl) {
    return currentUrl;
  }

  if (fallbackParams?.code) {
    return `code:${fallbackParams.code}`;
  }

  if (fallbackParams?.accessToken) {
    return `access:${String(fallbackParams.accessToken).slice(0, 24)}`;
  }

  if (fallbackParams?.token) {
    return `token:${String(fallbackParams.token).slice(0, 24)}`;
  }

  return 'empty';
}

export default function AuthCallback() {
  const router = useRouter();
  const { login, syncUserData } = useAuth();
  const params = useLocalSearchParams();
  const { token, user, error, code, access_token: accessToken } = params;

  useEffect(() => {
    const handleAuthCallback = async () => {
      const currentUrl =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? window.location.href
          : await Linking.getInitialURL();
      const callbackPageKey = buildCallbackPageKey(currentUrl, {
        token,
        user,
        error,
        code,
        accessToken,
      });
      const now = Date.now();

      if (callbackPageKey === inFlightCallbackPageKey && inFlightCallbackPagePromise) {
        await inFlightCallbackPagePromise;
        return;
      }

      if (
        callbackPageKey === lastCompletedCallbackPageKey &&
        now - lastCompletedCallbackPageAt < CALLBACK_PAGE_DEDUP_WINDOW_MS
      ) {
        return;
      }

      const processCallback = async () => {
        const readStoredPublicRoute = async () => {
          const [explicitReturnRoute, lastPublicRoute] = await Promise.all([
            database.read(StorageKeys.AUTH_RETURN_ROUTE).catch(() => null),
            database.read(StorageKeys.LAST_PUBLIC_ROUTE).catch(() => null),
          ]);

          return (
            normalizePublicMapRoute(explicitReturnRoute) ||
            normalizePublicMapRoute(lastPublicRoute)
          );
        };

        const clearStoredReturnRoute = async () => {
          await database.delete(StorageKeys.AUTH_RETURN_ROUTE).catch(() => {});
        };

        const finalizeAuth = async (resolvedUser, resolvedToken = null) => {
          const nextUser =
            resolvedUser && resolvedToken && !resolvedUser?.token
              ? { ...resolvedUser, token: resolvedToken }
              : resolvedUser;

          if (!nextUser) {
            return false;
          }

          const loginSucceeded = await login(nextUser);
          if (!loginSucceeded) {
            return false;
          }

          await syncUserData?.().catch(() => {});
          return true;
        };

        const resolvePublicFallback = async () => {
          return (await readStoredPublicRoute()) || PUBLIC_MAP_ROUTE;
        };

        const resolvePostAuthRoute = async () => {
          return (await readStoredPublicRoute()) || PUBLIC_MAP_ROUTE;
        };

        try {
          if (error) {
            console.error('Auth callback error:', error);
            const fallbackRoute = await resolvePublicFallback();
            await clearStoredReturnRoute();
            router.replace(fallbackRoute);
            return;
          }

          if (token && user) {
            let userData = user;
            if (typeof user === 'string') {
              try {
                userData = JSON.parse(decodeURIComponent(user));
              } catch (parseError) {
                console.error('Error parsing user data:', parseError);
                const fallbackRoute = await resolvePublicFallback();
                await clearStoredReturnRoute();
                router.replace(fallbackRoute);
                return;
              }
            }

            const authSettled = await finalizeAuth(userData, token);
            if (!authSettled) {
              const fallbackRoute = await resolvePublicFallback();
              await clearStoredReturnRoute();
              router.replace(fallbackRoute);
              return;
            }
            const nextRoute = await resolvePostAuthRoute();
            await clearStoredReturnRoute();
            router.replace(nextRoute);
            return;
          }

          if (currentUrl) {
            const {
              token: oauthToken,
              user: oauthUser,
              error: oauthError,
              code: oauthCode,
              accessToken: oauthAccessToken,
              refreshToken: oauthRefreshToken,
            } = readCallbackParams(currentUrl, {
              token,
              user,
              error,
              code,
              accessToken,
            });

            if (oauthError) {
              console.error('OAuth callback error:', oauthError);
              const fallbackRoute = await resolvePublicFallback();
              await clearStoredReturnRoute();
              router.replace(fallbackRoute);
              return;
            }

            if (!oauthToken && !oauthUser && !oauthError && !oauthCode && !oauthAccessToken) {
              const fallbackRoute = await resolvePublicFallback();
              await clearStoredReturnRoute();
              router.replace(fallbackRoute);
              return;
            }

            if (oauthToken && oauthUser) {
              let parsedUserData;
              try {
                parsedUserData = JSON.parse(decodeURIComponent(oauthUser));
              } catch (parseError) {
                console.error('Error parsing OAuth user data:', parseError);
                const fallbackRoute = await resolvePublicFallback();
                await clearStoredReturnRoute();
                router.replace(fallbackRoute);
                return;
              }

              const authSettled = await finalizeAuth(parsedUserData, oauthToken);
              if (!authSettled) {
                const fallbackRoute = await resolvePublicFallback();
                await clearStoredReturnRoute();
                router.replace(fallbackRoute);
                return;
              }
              const nextRoute = await resolvePostAuthRoute();
              await clearStoredReturnRoute();
              router.replace(nextRoute);
              return;
            }

            if (oauthCode || oauthAccessToken || oauthRefreshToken) {
              try {
                const result = await authService.handleOAuthCallback(currentUrl);

                if (result?.data?.user) {
                  const authSettled = await finalizeAuth(
                    result.data.user,
                    result.data.session?.access_token || result.data.user?.token || null
                  );
                  if (!authSettled) {
                    const fallbackRoute = await resolvePublicFallback();
                    await clearStoredReturnRoute();
                    router.replace(fallbackRoute);
                    return;
                  }
                  const nextRoute = await resolvePostAuthRoute();
                  await clearStoredReturnRoute();
                  router.replace(nextRoute);
                  return;
                }
              } catch (oauthError) {
                console.error('OAuth callback error:', oauthError);
                const fallbackRoute = await resolvePublicFallback();
                await clearStoredReturnRoute();
                router.replace(fallbackRoute);
                return;
              }
            }
          }

          const fallbackRoute = await resolvePublicFallback();
          await clearStoredReturnRoute();
          router.replace(fallbackRoute);
        } catch (callbackError) {
          console.error('Error handling auth callback:', callbackError);
          const fallbackRoute = await resolvePublicFallback();
          await clearStoredReturnRoute();
          router.replace(fallbackRoute);
        }
      };

      inFlightCallbackPageKey = callbackPageKey;
      inFlightCallbackPagePromise = processCallback().finally(() => {
        lastCompletedCallbackPageKey = callbackPageKey;
        lastCompletedCallbackPageAt = Date.now();
        if (inFlightCallbackPageKey === callbackPageKey) {
          inFlightCallbackPageKey = null;
          inFlightCallbackPagePromise = null;
        }
      });

      await inFlightCallbackPagePromise;
    };

    // Handle callback immediately
    void handleAuthCallback();
  }, [accessToken, code, error, login, router, syncUserData, token, user]);

  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: '#ffffff'
    }}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={{ 
        marginTop: 20, 
        fontSize: 16, 
        color: '#666',
        textAlign: 'center'
      }}>
        Signing you in...
      </Text>
    </View>
  );
}
