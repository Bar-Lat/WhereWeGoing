import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/styles/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSegments } from 'expo-router';

// ─── IMPORTY AUTORYZACJI I API ───
import { useAuth } from '@/providers/auth.provider';
import { getMyTrips } from '@/services/trip.api';

export default function MainLayout() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 10;
  const barHeight = 65 + bottomPadding;
  
  const segments = useSegments();
  const isOnCreate = segments.some(s => s === 'create');
  
  // ─── STAN DLA LICZNIKA WYCIECZEK ───
  const { session } = useAuth();
  const [activeTrips, setActiveTrips] = useState(0);

  useEffect(() => {
    const fetchTripsCount = async () => {
      if (!session?.access_token) return;
      try {
        const trips = await getMyTrips(session.access_token);
        setActiveTrips(trips?.length || 0);
      } catch (error) {
        console.error('Błąd pobierania liczby wycieczek do layoutu:', error);
      }
    };

    fetchTripsCount();
  }, [session?.access_token]);
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false, 
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.brand.blue, 
        tabBarInactiveTintColor: currentColors.subtext,
        tabBarStyle: {
          position: 'absolute', 
          backgroundColor: currentColors.card, 
          borderTopColor: currentColors.border, 
          borderTopWidth: 1,
          
          height: barHeight,
          paddingBottom: bottomPadding,
          paddingTop: 10,
          
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      {/* 1. HOME */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* 2. ODKRYWAJ */}
      <Tabs.Screen
        name="inspiration"
        options={{
          title: 'Inspiracje',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "compass" : "compass-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* 3. ŚRODKOWY PRZYCISK Z TWOIM GRADIENTEM */}
      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarIcon: () => isOnCreate ? null : (
            <View style={styles.floatingButtonContainer}>
              <LinearGradient
                colors={Colors.brand.logoGradient} 
                style={styles.floatingButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="add" size={32} color="#FFFFFF" />
              </LinearGradient>
            </View>
          ),
        }}
      />

      {/* 4. MOJE PLANY */}
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Moje plany',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons name={focused ? "briefcase" : "briefcase-outline"} size={24} color={color} />
              
              {activeTrips > 0 && (
                <View style={[styles.badge, { borderColor: currentColors.card }]}>
                  <Text style={styles.badgeText}>
                    {activeTrips > 99 ? '99+' : activeTrips}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      {/* 5. PROFIL */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* 6. UKRYTE SZCZEGÓŁY WYCIECZKI */}
      <Tabs.Screen
        name="trip-details"
        options={{
          href: null, // To całkowicie usuwa przycisk z dolnego paska nawigacji
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingButtonContainer: {
    top: -20, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#FF3B30', 
    width: 20,
    height: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
});