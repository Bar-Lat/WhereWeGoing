import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View, useColorScheme } from 'react-native';
import { AuthProvider, useAuth } from '@/providers/auth.provider';
import { ProfileProvider } from '@/providers/profile.provider';
import DevMenu from '../components/DevMenu';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {NetworkProvider} from '@/providers/network.provider'
import OfflineBanner from '@/components/OfflineBanner'
import { NotificationsProvider } from '@/providers/notifications.provider';


function AppNavigator() {
    const router = useRouter();
    const segments = useSegments();
    const { isAuthenticated, isBootstrapping } = useAuth();
    const colorScheme = useColorScheme();

    useEffect(() => {
        if (isBootstrapping) {
            return;
        }

        const inAuthGroup = segments[0] === '(auth)';
        const inMainGroup = segments[0] === '(main)';

        if (isAuthenticated && inAuthGroup) {
            router.replace('/(main)/home');
            return;
        }

        if (!isAuthenticated && inMainGroup) {
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
        <SafeAreaProvider>
            {/* Dynamicznie dopasowuje kolor ikon baterii/godziny do motywu */}
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

            <Stack screenOptions={{ headerShown: false }}>
                {/* Grupy są wykrywane automatycznie, ale możesz tu zdefiniować ich kolejność */}
                <Stack.Screen name="(auth)" options={{ animation: 'default' }} />
                <Stack.Screen name="(main)" options={{ animation: 'default' }} />
                <Stack.Screen name="trip-loading" options={{ animation: 'fade' }} />
                <Stack.Screen name="trip-result" options={{ animation: 'slide_from_right' }} />
            </Stack>
            <OfflineBanner />

            {/* Nasz pomocnik deweloperski dostępny w każdym miejscu aplikacji */}
            <DevMenu />
        </SafeAreaProvider>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <NotificationsProvider>
                <NetworkProvider>
                    <ProfileProvider>
                        <AppNavigator />
                    </ProfileProvider>
                </NetworkProvider>
            </NotificationsProvider>
        </AuthProvider>
    );
}