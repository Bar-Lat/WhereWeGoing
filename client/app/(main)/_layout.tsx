import React, { useEffect, useState } from 'react';
import { Tabs, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/styles/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetwork } from '@/providers/network.provider';
import { useAuth } from '@/providers/auth.provider';
import { getMyTrips } from '@/services/trips.api';
import { useTripStore } from '@/stores/tripStore';

const TripsTabIcon = ({ color, focused, currentColors }: any) => {
  const trips = useTripStore((state) => state.trips) || [];
  const count = trips.length;

  return (
    <View>
      <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={24} color={color} />
      {count > 0 && (
        <View style={[styles.badge, { borderColor: currentColors.card }]}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </View>
  );
};

export default function MainLayout() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];

  const bottomPadding = insets.bottom > 0 ? insets.bottom : 10;
  const barHeight = 65 + bottomPadding;

  const segments = useSegments();
  const isOnCreate = segments.some((segment) => segment === 'create');

  const { isOffline } = useNetwork();
  const [offlineMessageVisible, setOfflineMessageVisible] = useState(false);

  const { session } = useAuth();
  const setTrips = useTripStore((state) => state.setTrips);

  useEffect(() => {
    const loadTrips = async () => {
      if (!session?.access_token) {
        setTrips([]);
        return;
      }

      try {
        const data = await getMyTrips(session.access_token);
        setTrips(data.trips);
      } catch (error) {
        console.error('Błąd ładowania wycieczek w Layout:', error);
        setTrips([]);
      }
    };

    void loadTrips();
  }, [session?.access_token, setTrips]);

  const showOfflinePopup = () => {
    setOfflineMessageVisible(true);

    setTimeout(() => {
      setOfflineMessageVisible(false);
    }, 3000);
  };

  const blockWhenOffline = {
    tabPress: (event: any) => {
      if (isOffline) {
        event.preventDefault();
        showOfflinePopup();
      }
    },
  };

  return (
    <View style={{ flex: 1 }}>
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
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="inspiration"
          options={{
            title: 'Inspiracje',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'compass' : 'compass-outline'} size={24} color={color} />
            ),
          }}
          listeners={blockWhenOffline}
        />

        <Tabs.Screen
          name="create"
          options={{
            title: '',
            tabBarIcon: () =>
              isOnCreate ? null : (
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
          listeners={blockWhenOffline}
        />

        <Tabs.Screen
          name="trips"
          options={{
            title: 'Moje plany',
            tabBarIcon: (props) => (
              <TripsTabIcon
                color={props.color}
                focused={props.focused}
                currentColors={currentColors}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profil',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="trip-details"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {offlineMessageVisible && (
        <View style={styles.offlinePopup}>
          <Text style={styles.offlinePopupText}>Opcja niedostępna w trybie offline</Text>
        </View>
      )}
    </View>
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
  offlinePopup: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 140,
    backgroundColor: '#524f4f',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 999,
    elevation: 10,
  },
  offlinePopupText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});