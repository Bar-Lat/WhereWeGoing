import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '@/providers/auth.provider';
import DevMenu from '../components/DevMenu';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';


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
            router.replace('/(main)');
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
                <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
                <Stack.Screen name="(main)" options={{ animation: 'fade' }} />
            </Stack>

            {/* Nasz pomocnik deweloperski dostępny w każdym miejscu aplikacji */}
            <DevMenu />
        </SafeAreaProvider>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <AppNavigator />
        </AuthProvider>
    );
}