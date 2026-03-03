import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import { authService } from '../../services/authService';
import { database, StorageKeys } from '../../database';
import { consumePendingOAuthCallbackUrl } from '../../services/auth/oauthCallbackStore';

export default function AuthCallback() {
  const router = useRouter();
  const { token, user, error } = useLocalSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const pendingOAuthUrl = consumePendingOAuthCallbackUrl();

        // Check for authentication errors
        if (error) {
          console.error('Auth callback error:', error);
          router.replace('/(auth)/login');
          return;
        }

        // Preferred path: process full OAuth callback URL captured by deep-link listener.
        if (pendingOAuthUrl && (pendingOAuthUrl.includes('code=') || pendingOAuthUrl.includes('access_token='))) {
          console.log('Handling OAuth callback from pending deep link URL');
          const result = await authService.handleOAuthCallback(pendingOAuthUrl);

          if (result?.data?.user) {
            const accessToken = result?.data?.session?.access_token || result?.data?.user?.token;
            if (accessToken) {
              await database.write(StorageKeys.AUTH_TOKEN, accessToken);
            }
            await database.write(StorageKeys.CURRENT_USER, result.data.user);
            router.replace('/(user)/(tabs)');
            return;
          }
        }

        // Handle successful authentication from URL params
        if (token && user) {
          // Parse user data if it's a string
          let userData = user;
          if (typeof user === 'string') {
            try {
              userData = JSON.parse(decodeURIComponent(user));
            } catch (parseError) {
              console.error('Error parsing user data:', parseError);
              router.replace('/(auth)/login');
              return;
            }
          }

          // Store authentication data
          await database.write(StorageKeys.AUTH_TOKEN, token);
          await database.write(StorageKeys.CURRENT_USER, userData);

          // Redirect to main app
          router.replace('/(user)/(tabs)');
          return;
        }

        // Handle OAuth callback from deep link URL
        const currentUrl = await Linking.getInitialURL();
        if (currentUrl) {
          const parsedUrl = Linking.parse(currentUrl);
          const queryParams = parsedUrl.queryParams;
          
          const oauthToken = queryParams?.token;
          const oauthUser = queryParams?.user;

          if (oauthToken && oauthUser) {
            let parsedUserData;
            try {
              parsedUserData = JSON.parse(decodeURIComponent(oauthUser));
            } catch (parseError) {
              console.error('Error parsing OAuth user data:', parseError);
              router.replace('/(auth)/login');
              return;
            }

            // Store OAuth authentication data
            await database.write(StorageKeys.AUTH_TOKEN, oauthToken);
            await database.write(StorageKeys.CURRENT_USER, parsedUserData);

            // Redirect to main app
            router.replace('/(user)/(tabs)');
            return;
          }

          // Handle OAuth callback with code parameter
          const hasCode = typeof queryParams?.code === 'string' && queryParams.code.length > 0;
          const hasAccessToken = currentUrl.includes('access_token=');
          if (hasCode || hasAccessToken) {
            console.log('Handling OAuth callback with code');
            try {
              const result = await authService.handleOAuthCallback(currentUrl);
              
              if (result?.data?.user) {
                // Store authentication data and redirect to main app
                const accessToken = result?.data?.session?.access_token || result?.data?.user?.token;
                if (accessToken) {
                  await database.write(StorageKeys.AUTH_TOKEN, accessToken);
                }
                await database.write(StorageKeys.CURRENT_USER, result.data.user);
                router.replace('/(user)/(tabs)');
                return;
              }
            } catch (oauthError) {
              console.error('OAuth callback error:', oauthError);
              router.replace('/(auth)/login');
              return;
            }
          }
        }

        // If no auth data found, redirect to login
        console.log('No authentication data found in callback');
        router.replace('/(auth)/login');

      } catch (error) {
        console.error('Error handling auth callback:', error);
        router.replace('/(auth)/login');
      }
    };

    // Handle callback immediately
    handleAuthCallback();
  }, [token, user, error, router]);

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
        Completing authentication...
      </Text>
    </View>
  );
}
