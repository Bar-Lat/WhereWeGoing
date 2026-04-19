import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import DevMenu from '../components/DevMenu';

// Zapobiega automatycznemu ukrywaniu splash screena
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Tutaj w przyszłości możesz ładować czcionki lub dane z API
    // Na razie po prostu ukrywamy splash screen po zamontowaniu layoutu
    SplashScreen.hideAsync();
  }, []);

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