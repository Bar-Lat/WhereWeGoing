import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  ImageBackground,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/styles/colors';
import ScreenHeader from '@/components/ScreenHeader';
import { useAuth } from '@/providers/auth.provider';
import EditProfileModal from '@/components/EditProfileModal';
import { Ionicons } from '@expo/vector-icons';
import { useCurrentUserProfile } from '@/hooks/useCurrentUserProfile';
import { useProfile } from '@/providers/profile.provider';
import { getTripHistory, type TripHistoryItem } from '@/services/trip.api';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const { signOut, session } = useAuth();
  const { profile } = useCurrentUserProfile();
  const { isLoading, setProfile } = useProfile();
  const bottomPadding = 65 + (insets.bottom > 0 ? insets.bottom : 10) + 30;

  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<'history' | 'none'>('none');
  const [history, setHistory] = useState<TripHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [expandedTripIds, setExpandedTripIds] = useState<string[]>([]);

  const accessToken = session?.access_token ?? null;

  // Resetujemy błąd ładowania obrazka, jeśli zmieni się link do awatara
  useEffect(() => {
    setAvatarLoadError(false);
  }, [profile?.avatar]);

  // Obliczanie inicjałów
  const avatarInitials = useMemo(() => {
    const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
    if (fullName.length > 0) {
      const parts = fullName.split(' ').filter(Boolean);
      return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
    }
    const email = profile?.email ?? '';
    return email.slice(0, 2).toUpperCase() || 'U';
  }, [profile?.email, profile?.firstName, profile?.lastName]);

  const userNameLabel = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'Imię Nazwisko';
  const emailLabel = profile?.email || 'Brak adresu e-mail';

  const menuItems = [
    { label: 'Edytuj profil', icon: 'person-outline' },
    { label: 'Moje statystyki', icon: 'bar-chart-outline' },
    { label: 'Historia', icon: 'time-outline' },
    { label: 'Zaproś znajomych', icon: 'share-social-outline' },
    { label: 'Wyloguj się', icon: 'log-out-outline' },
  ] as const;

  const loadHistory = useCallback(async () => {
    if (!accessToken) {
      setHistoryError('Brak dostępu. Zaloguj się ponownie.');
      setHistory([]);
      return;
    }

    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const response = await getTripHistory(accessToken);
      setHistory(response.trips);
    } catch (fetchError) {
      setHistoryError(fetchError instanceof Error ? fetchError.message : 'Błąd podczas pobierania historii.');
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (selectedPanel === 'history') {
      void loadHistory();
    }
  }, [loadHistory, selectedPanel]);

  // Obsługa przycisku wstecz - zamyka historię
  useFocusEffect(
    useCallback(() => {
      const handleBackPress = () => {
        if (selectedPanel === 'history') {
          setSelectedPanel('none');
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

      return () => subscription.remove();
    }, [selectedPanel])
  );

  const toggleHistoryDay = useCallback((tripId: string) => {
    setExpandedTripIds((current) =>
      current.includes(tripId) ? current.filter((id) => id !== tripId) : [...current, tripId]
    );
  }, []);

  const onMenuItemPress = useCallback(
    (label: typeof menuItems[number]['label']) => {
      if (label === 'Historia') {
        setSelectedPanel('history');
        return;
      }
      // Dla wszystkich innych opcji zamykamy historię
      setSelectedPanel('none');
      if (label === 'Edytuj profil') {
        setIsEditModalVisible(true);
        return;
      }
      if (label === 'Wyloguj się') {
        signOut('manual');
      }
    },
    [signOut]
  );

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      {selectedPanel === 'history' ? (
        // FULLSCREEN HISTORY VIEW
        <>
          <View style={[styles.historyScreenHeader, { backgroundColor: currentColors.card, borderBottomColor: currentColors.border }]}>
            <Text style={[styles.historyScreenTitle, { color: currentColors.text }]}>Historia wycieczek</Text>
            <TouchableOpacity style={styles.historyCloseButton} onPress={() => setSelectedPanel('none')}>
              <Ionicons name="close" size={28} color={currentColors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={[styles.historyScreenContent, { paddingBottom: bottomPadding }]}>
            {historyLoading ? (
              <View style={styles.historyLoader}>
                <ActivityIndicator size="large" color={Colors.brand.blue} />
              </View>
            ) : historyError ? (
              <View style={styles.historyMessage}>
                <Text style={[styles.historyMessageText, { color: currentColors.text }]}>{historyError}</Text>
              </View>
            ) : history.length === 0 ? (
              <View style={styles.historyMessage}>
                <Text style={[styles.historyMessageText, { color: currentColors.text }]}>Brak historii wycieczek do wyświetlenia.</Text>
              </View>
            ) : (
              history.map((trip) => {
                const isExpanded = expandedTripIds.includes(trip.id);
                const dateLabel = [trip.startDate, trip.endDate].filter(Boolean).join(' / ');
                const totalLabel = trip.total !== null ? `${trip.total.toLocaleString()} PLN` : '-';
                const budgetLabel = trip.budget !== null ? `${trip.budget.toLocaleString()} PLN` : '-';

                return (
                  <View key={trip.id} style={[styles.historyCard, { borderColor: currentColors.border }]}>
                    <TouchableOpacity style={styles.historyCardHeader} onPress={() => toggleHistoryDay(trip.id)}>
                      <Ionicons
                        name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                        size={22}
                        color={currentColors.text}
                        style={styles.historyArrow}
                      />
                      <View style={styles.historyHeaderText}>
                        <Text style={[styles.historyDestination, { color: currentColors.text }]}>{trip.destination}</Text>
                        <Text style={[styles.historySubtitle, { color: currentColors.subtext }]}>{dateLabel}</Text>
                        <Text style={[styles.historySubtitle, { color: currentColors.subtext }]}>Łącznie: {totalLabel} · Budżet: {budgetLabel}</Text>
                      </View>
                    </TouchableOpacity>

                    <ImageBackground
                      source={{ uri: trip.imageUrl ?? undefined }}
                      style={styles.historyImage}
                      imageStyle={styles.historyImageStyle}
                    >
                      <View style={styles.historyImageOverlay} />
                    </ImageBackground>

                    {isExpanded && (
                      <View style={[styles.historyDetails, { borderTopColor: currentColors.border }]}>
                        {trip.days.length === 0 ? (
                          <Text style={[styles.historyEmptyText, { color: currentColors.subtext }]}>Brak aktywności dla tej wycieczki.</Text>
                        ) : (
                          trip.days.map((day, dayIndex) => {
                            const dayLabel = day.dayNumber !== null ? `Dzień ${day.dayNumber}` : `Dzień ${dayIndex + 1}`;

                            return (
                              <View key={day.dayId} style={styles.historyDayBlock}>
                                <Text style={[styles.historyDayTitle, { color: currentColors.text }]}>{dayLabel}</Text>
                                {day.activities.map((activity) => (
                                  <View key={activity.id} style={[styles.historyActivity, { borderBottomColor: currentColors.border }]}>
                                    <View style={styles.historyActivityLeft}>
                                      <Text style={[styles.historyActivityName, { color: currentColors.text }]}>{activity.name}</Text>
                                      <Text style={[styles.historyActivityMeta, { color: currentColors.subtext }]}>{activity.time ?? 'Brak godziny'} · {activity.duration_minutes ?? '-'} min</Text>
                                    </View>
                                    <Text style={[styles.historyActivityCost, { color: currentColors.text }]}>{activity.cost !== null ? `${activity.cost.toLocaleString()} PLN` : '-'}</Text>
                                  </View>
                                ))}
                              </View>
                            );
                          })
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </>
      ) : (
        // PROFILE VIEW
        <>
          <ScreenHeader 
            variant="default" 
            title="Mój Profil" 
            showProfile={false} 
            onNotificationPress={() => console.log('Powiadomienia')} // Placeholder dla przycisku powiadomień
          />

          <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}>
            {isLoading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={Colors.brand.blue} />
              </View>
            ) : (
              <>
                {/* --- SEKCJA GŁÓWNA PROFILU --- */}
                <View style={styles.profileHeader}>
              <View style={[styles.avatarWrapper, { borderColor: currentColors.border }]}>
                {profile?.avatar && !avatarLoadError ? (
                  <Image
                    source={{ uri: profile.avatar }}
                    style={styles.avatarImage}
                    onError={() => setAvatarLoadError(true)}
                  />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: Colors.brand.blue }]}> 
                    <Text style={styles.avatarText}>{avatarInitials}</Text>
                  </View>
                )}
                {/* Opcjonalna plakietka edycji na awatarze */}
                <TouchableOpacity 
                  style={[styles.editBadge, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}
                  onPress={() => setIsEditModalVisible(true)}
                >
                  <Ionicons name="pencil" size={14} color={currentColors.text} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.userName, { color: currentColors.text }]}>{userNameLabel}</Text>
              <Text style={[styles.userEmail, { color: currentColors.subtext }]}>{emailLabel}</Text>
            </View>

            {/* --- MENU OPCJI --- */}
            <View style={[styles.menuContainer, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
              {menuItems.map((item, index) => {
                const isLogout = item.label === 'Wyloguj się';
                const iconColor = isLogout ? '#ff4444' : currentColors.text;

                return (
                  <TouchableOpacity
                    key={item.label}
                    onPress={() => onMenuItemPress(item.label)}
                    style={[
                      styles.menuItem,
                      index !== menuItems.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: currentColors.border,
                      },
                    ]}
                  >
                    <View style={styles.menuItemLeft}>
                      <Ionicons 
                        name={item.icon as any} 
                        size={22} 
                        color={iconColor} 
                        style={styles.menuIcon} 
                      />
                      <Text style={{ 
                        color: iconColor, 
                        fontSize: 16,
                        fontWeight: '500' 
                      }}>
                        {item.label}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={currentColors.subtext} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
          </ScrollView>
        </>
      )}

      {/* --- MODAL EDYCJI --- */}      <EditProfileModal
        visible={isEditModalVisible}
        accessToken={accessToken}
        initialProfile={profile}
        onClose={() => setIsEditModalVisible(false)}
        onProfileUpdated={(updatedProfile) => {
          setProfile(updatedProfile);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  loaderContainer: { paddingTop: 40, alignItems: 'center' },
  
  // Sekcja Górna
  profileHeader: { alignItems: 'center', marginBottom: 35, marginTop: 10 },
  avatarWrapper: { 
    alignItems: 'center', 
    marginBottom: 15, 
    position: 'relative',
    padding: 4,
    borderWidth: 1,
    borderRadius: 65,
  },
  avatarImage: { width: 110, height: 110, borderRadius: 55 },
  avatarFallback: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  userName: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  userEmail: { fontSize: 15, fontWeight: '500' },
  
  // Menu
  menuContainer: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 14,
  },
  historyScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    paddingTop: 16,
  },
  historyScreenTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  historyCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyScreenContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  historyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 50,
  },
  historyPanel: {
    width: '100%',
    maxHeight: '88%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  historyScrollContent: {
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  historyLoader: { padding: 24, alignItems: 'center' },
  historyMessage: { padding: 20, alignItems: 'center' },
  historyMessageText: { textAlign: 'center', fontSize: 15, lineHeight: 22 },
  historyCard: { borderWidth: 1, borderRadius: 20, overflow: 'hidden', marginBottom: 18 },
  historyCardHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 16 },
  historyArrow: { marginTop: 4, marginRight: 12 },
  historyHeaderText: { flex: 1 },
  historyDestination: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  historySubtitle: { fontSize: 14, lineHeight: 20 },
  historyImage: { width: '100%', height: 140, justifyContent: 'flex-end' },
  historyImageStyle: { resizeMode: 'cover' },
  historyImageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.16)' },
  historyDetails: { padding: 16, borderTopWidth: 1 },
  historyEmptyText: { fontSize: 14, lineHeight: 20 },
  historyDayBlock: { marginBottom: 18 },
  historyDayTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  historyActivity: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  historyActivityLeft: { flex: 1, paddingRight: 12 },
  historyActivityName: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  historyActivityMeta: { fontSize: 13 },
  historyActivityCost: { fontSize: 14, fontWeight: '700' },
});