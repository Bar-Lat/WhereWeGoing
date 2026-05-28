import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, useColorScheme, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Colors } from '@/styles/colors';
import { styles } from '@/styles/trips.styles';
import ScreenHeader from '../../components/ScreenHeader';
import { useCurrentUserProfile } from '@/hooks/useCurrentUserProfile';
import { useAuth } from '@/providers/auth.provider';
import { getMyTrips } from '@/services/trip.api';

// IMPORT DO OBSŁUGI KLIKNIĘCIA:
import { useTripStore, TripPlan } from '@/stores/tripStore';

// --- HELPERY FORMATOWANIA ---
const MONTHS = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

const formatDateRange = (startStr: string, endStr: string) => {
  if (!startStr || !endStr) return 'Brak daty';
  const start = new Date(startStr);
  const end = new Date(endStr);
  return `${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
};

const getTripStatusInfo = (startDate: string, endDate: string) => {
  const now = new Date().getTime();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  if (now > end) return { label: 'Zakończona', color: '#8B90A7', daysLeft: null, pulse: false };
  if (now >= start && now <= end) return { label: 'W trakcie', color: Colors.brand.green, daysLeft: null, pulse: true };
  
  const daysLeft = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
  return { label: 'Nadchodząca', color: Colors.brand.blue, daysLeft, pulse: true };
};

// --- KOMPONENT ---
export default function Trips() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  
  const { session } = useAuth();
  const { userAvatarUrl, userInitials } = useCurrentUserProfile();
  
  // Zaciągamy metodę do ustawiania aktywnego planu
  const { setTripPlan } = useTripStore();

  const [trips, setTrips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const bottomPadding = 65 + (insets.bottom > 0 ? insets.bottom : 10) + 20;

  const fetchTrips = useCallback(async () => {
  if (!session?.access_token) return;
  try {
    const data = await getMyTrips(session.access_token);
    console.log("SUROWE WYCIECZKI Z API:", data); // ZOBACZ TO W KONSOLI!
    setTrips(data || []);
  } catch (error) {
    console.error('Błąd pobierania wycieczek:', error);
  } finally {
    setIsLoading(false);
    setIsRefreshing(false);
  }
}, [session?.access_token]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchTrips();
  };


const handleTripPress = (trip: any) => {
  const rawPlan = trip.notes || trip.plan || trip.itinerary || trip.data || {};
  const parsedData = typeof rawPlan === 'string' ? JSON.parse(rawPlan) : rawPlan;

  const activePlan: TripPlan = {
    id: trip.id,
    destination: trip.destination || "Nieznane miejsce",
    summary: parsedData?.summary || "Brak opisu",
    totalDays: Array.isArray(parsedData?.days) ? parsedData.days.length : 0,
    estimatedTotalCost: trip.total_budget ?? 0,
    currency: parsedData?.currency || "PLN",
    days: Array.isArray(parsedData?.days) ? parsedData.days : [],
    generalTips: Array.isArray(parsedData?.generalTips) ? parsedData.generalTips : [],
    bestTransport: parsedData?.bestTransport || "Brak danych",
    imageUrl: trip.image_url || 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1000' // <--- DODANO
  };

  useTripStore.getState().setTripPlan(activePlan);
  router.push('../trip-details');
};

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.brand.blue} />
        }
      >
        <ScreenHeader 
          variant="trips"
          title="Twoje Podróże"
          tripCount={trips.length}
          userInitials={userInitials}
          onNotificationPress={() => {}}
          onProfilePress={() => router.push('/(main)/profile')}
          userAvatarUrl={userAvatarUrl}
        />
        
        <View style={[styles.scrollContent, { marginTop: -25, zIndex: 10 }]}>
          {isLoading ? (
            <ActivityIndicator size="large" color={Colors.brand.blue} style={{ marginTop: 60 }} />
          ) : trips.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>🌍</Text>
              <Text style={{ color: currentColors.text, fontSize: 18, fontWeight: '600' }}>Brak zaplanowanych wycieczek</Text>
              <Text style={{ color: currentColors.subtext, marginTop: 8 }}>Kliknij + poniżej, aby stworzyć swój pierwszy plan!</Text>
            </View>
          ) : (
            trips.map((trip) => {
              const statusInfo = getTripStatusInfo(trip.start_date, trip.end_date);
              
              let attractionsCount = 0; // potrzebna funckja do zliczenia atrakcji
              try {
                const planData = JSON.parse(trip.notes);
                planData.days.forEach((day: any) => {
                  attractionsCount += day.activities.length;
                });
              } catch (e) {}

              // Fallback obrazka, gdyby brakowało w bazie
              const tripImage = trip.image_url || 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1000';

              return (
                <TouchableOpacity 
                  key={trip.id} 
                  activeOpacity={0.9}
                  style={[styles.heroCard, { backgroundColor: currentColors.card, borderColor: currentColors.border, borderWidth: 1 }]}
                  onPress={() => handleTripPress(trip)}
                >
                  <Image source={{ uri: tripImage }} style={styles.heroImage} />
                  <View style={styles.heroOverlay} />
                  
                  {/* Badge ze statusem (Dni do wyjazdu lub W trakcie/Zakończona) */}
                  <View style={styles.daysBadge}>
                    {statusInfo.pulse && <View style={[styles.pulseDot, { backgroundColor: statusInfo.color }]} />}
                    <Text style={styles.daysBadgeText}>
                      {statusInfo.daysLeft ? `${statusInfo.daysLeft} dni` : statusInfo.label}
                    </Text>
                  </View>

                  <View style={styles.heroBottom}>
                    <View style={styles.heroSubtitleRow}>
                      <Ionicons name="location" size={14} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.heroSubtitle}>
                        {trip.total_budget} PLN · {attractionsCount > 0 ? `${attractionsCount} atrakcji` : 'Plan do uzupełnienia'}
                      </Text>
                    </View>
                    <View style={styles.heroMainRow}>
                      <View>
                        <Text style={styles.heroDestination}>{trip.destination}</Text>
                        <Text style={styles.heroDates}>
                          {formatDateRange(trip.start_date, trip.end_date)}
                        </Text>
                      </View>
                      <View style={styles.heroArrow}>
                        <Ionicons name="chevron-forward" size={20} color="white" />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}