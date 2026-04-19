import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../providers/auth.provider';

function AppNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isBootstrapping } = useAuth();

  useEffect(() => {
    if (isBootstrapping) {
      console.log('[ROUTE_GUARD_BOOTSTRAPPING]', { segments });
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inMainGroup = segments[0] === '(main)';

    console.log('[ROUTE_GUARD_STATE]', {
      isAuthenticated,
      inAuthGroup,
      inMainGroup,
      segments,
    });

    if (isAuthenticated && inAuthGroup) {
      console.log('[ROUTE_GUARD_REDIRECT]', {
        reason: 'authenticated-in-auth-group',
        target: '/(main)',
      });
      router.replace('/(main)');
      return;
    }

    if (!isAuthenticated && inMainGroup) {
      console.log('[ROUTE_GUARD_REDIRECT]', {
        reason: 'unauthenticated-in-main-group',
        target: '/(auth)/welcome',
      });
      router.replace('/(auth)/welcome');
    }
  }, [isAuthenticated, isBootstrapping, router, segments]);

  if (isBootstrapping) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(main)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
