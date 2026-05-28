import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Colors } from '@/styles/colors';
import { styles } from '@/styles/trips.styles';
import ScreenHeader from '../../components/ScreenHeader';
import { useCurrentUserProfile } from '@/hooks/useCurrentUserProfile';
import { useNotifications } from '@/providers/notifications.provider';

// --- MOCK DATA ---
const TRIPS = [
  {
    id: '1',
    destination: 'Paryż, Francja',
    dates: '12 Cze – 18 Cze 2026',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=500',
    status: 'Nadchodząca',
    statusColor: Colors.brand.blue,
  },
  {
    id: '2',
    destination: 'Rzym, Włochy',
    dates: '20 Lip – 25 Lip 2026',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=500',
    status: 'W planach',
    statusColor: '#F59E0B',
  },
  {
    id: '3',
    destination: 'Tatry, Polska',
    dates: '05 Sty – 10 Sty 2025',
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=500',
    status: 'Zakończona',
    statusColor: '#8B90A7',
  }
];

export default function Trips() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const { userAvatarUrl, userInitials } = useCurrentUserProfile();

  const bottomPadding = 65 + (insets.bottom > 0 ? insets.bottom : 10) + 20;

  const { hasUnreadNotifications } = useNotifications();

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        <ScreenHeader 
        variant="trips"
        title="Twoje Podróże"
        tripCount={TRIPS.length}
        userInitials={userInitials}
        onNotificationPress={() => router.push('/notifications')}
        onProfilePress={() => router.push('/(main)/profile')}
        userAvatarUrl={userAvatarUrl}
        hasUnreadNotifications={hasUnreadNotifications}
      />
        <View style={[styles.scrollContent, { marginTop: -45, zIndex: 10 }]}>
          
          {TRIPS.map((trip) => (
            <TouchableOpacity 
              key={trip.id} 
              activeOpacity={0.9}
              style={[styles.tripCard, { backgroundColor: currentColors.card, borderColor: currentColors.border, borderWidth: 1 }]}
              onPress={() => console.log('Szczegóły podróży:', trip.destination)} // TODO: nawigacja do szczegółów podróży
            >
              <Image source={{ uri: trip.image }} style={styles.tripImage} />
              
              <View style={styles.tripInfo}>
                <View style={styles.tripHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.destination, { color: currentColors.text }]}>{trip.destination}</Text>
                    <View style={styles.dateRow}>
                      <Ionicons name="calendar-outline" size={14} color={currentColors.subtext} />
                      <Text style={[styles.dateText, { color: currentColors.subtext }]}>{trip.dates}</Text>
                    </View>
                  </View>
                  
                  <View style={[styles.statusBadge, { backgroundColor: trip.statusColor }]}>
                    <Text style={styles.statusText}>{trip.status}</Text>
                  </View>
                </View>

                {/* Statystyki dolne karty */}
                <View style={[styles.tripStats, { borderTopColor: currentColors.border }]}>
                  <View style={styles.dateRow}>
                    <Ionicons name="people-outline" size={16} color={currentColors.subtext} />
                    <Text style={[styles.dateText, { color: currentColors.subtext }]}>2 osoby</Text>
                  </View>
                  <View style={styles.dateRow}>
                    <Ionicons name="map-outline" size={16} color={currentColors.subtext} />
                    <Text style={[styles.dateText, { color: currentColors.subtext }]}>8 miejsc</Text>
                  </View>
                  <TouchableOpacity style={{ marginLeft: 'auto' }}>
                    <Ionicons name="ellipsis-horizontal" size={20} color={currentColors.subtext} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}