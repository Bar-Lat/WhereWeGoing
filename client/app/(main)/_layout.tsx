import React, { useEffect, useState } from 'react';
import { Tabs, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Modal,
  TouchableOpacity,
} from 'react-native';

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
      <Ionicons
        name={focused ? 'briefcase' : 'briefcase-outline'}
        size={24}
        color={color}
      />

      {count > 0 && (
        <View style={[styles.badge, { borderColor: currentColors.card }]}>
          <Text style={styles.badgeText}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      )}
    </View>
  );
};

export default function MainLayout() {
  const insets = useSafeAreaInsets();

  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];

  const isEditingMode = useTripStore((state) => state.isEditingMode);

  const [layoutAlert, setLayoutAlert] = useState({
    visible: false,
    title: '',
    message: '',
    actions: [] as any[],
  });

  const { isOffline } = useNetwork();

  const [offlineMessageVisible, setOfflineMessageVisible] = useState(false);

  const { session } = useAuth();

  const setTrips = useTripStore((state) => state.setTrips);

  const bottomPadding = insets.bottom > 0 ? insets.bottom : 10;
  const barHeight = 65 + bottomPadding;

  const segments = useSegments();

  const isOnCreate = segments.some(
    (segment) => segment === 'create'
  );

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
        console.error(
          'Błąd ładowania wycieczek w Layout:',
          error
        );

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

  const combinedTabPressListener = {
    tabPress: (event: any) => {
      if (isOffline) {
        event.preventDefault();
        showOfflinePopup();
        return;
      }

      if (isEditingMode) {
        event.preventDefault();

        setLayoutAlert({
          visible: true,
          title: 'Tryb edycji',
          message: 'Masz niezapisane zmiany w planie!',
          actions: [{ text: 'OK' }],
        });
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
          listeners={combinedTabPressListener}
          options={{
            title: 'Home',

            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="inspiration"
          listeners={combinedTabPressListener}
          options={{
            title: 'Inspiracje',

            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'compass' : 'compass-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="create"
          listeners={combinedTabPressListener}
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
                    <Ionicons
                      name="add"
                      size={32}
                      color="#FFFFFF"
                    />
                  </LinearGradient>
                </View>
              ),
          }}
        />

        <Tabs.Screen
          name="trips"
          listeners={combinedTabPressListener}
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
          listeners={combinedTabPressListener}
          options={{
            title: 'Profil',

            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={24}
                color={color}
              />
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

      {/* OFFLINE POPUP */}
      {offlineMessageVisible && (
        <View style={styles.offlinePopup}>
          <Text style={styles.offlinePopupText}>
            Opcja niedostępna w trybie offline
          </Text>
        </View>
      )}

      {/* CUSTOM ALERT */}
      <Modal
        visible={layoutAlert.visible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: currentColors.background,
                width: '85%',
                padding: 24,
              },
            ]}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: '800',
                textAlign: 'center',
                color: currentColors.text,
                marginBottom: 12,
              }}
            >
              {layoutAlert.title}
            </Text>

            <Text
              style={{
                fontSize: 15,
                textAlign: 'center',
                color: currentColors.subtext,
                marginBottom: 24,
                lineHeight: 22,
              }}
            >
              {layoutAlert.message}
            </Text>

            <View style={{ width: '100%', gap: 10 }}>
              {layoutAlert.actions.map((action, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    setLayoutAlert((prev) => ({
                      ...prev,
                      visible: false,
                    }));

                    if (action.onPress) {
                      setTimeout(() => action.onPress(), 150);
                    }
                  }}
                  style={[
                    styles.alertBtn,
                    {
                      backgroundColor: Colors.brand.blue,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.alertBtnText,
                      { color: '#fff' },
                    ]}
                  >
                    {action.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',

    justifyContent: 'center',
    alignItems: 'center',

    padding: 20,
  },

  modalCard: {
    width: '100%',
    borderRadius: 24,
    padding: 24,

    alignItems: 'center',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,

    elevation: 10,
  },

  alertBtn: {
    width: '100%',
    paddingVertical: 14,

    borderRadius: 14,

    alignItems: 'center',
    justifyContent: 'center',
  },

  alertBtnText: {
    fontSize: 16,
    fontWeight: '700',
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