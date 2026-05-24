import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/styles/colors';
import ScreenHeader from '@/components/ScreenHeader';
import { useAuth } from '@/providers/auth.provider';
import EditProfileModal from '@/components/EditProfileModal';
import { Ionicons } from '@expo/vector-icons';
import { useCurrentUserProfile } from '@/hooks/useCurrentUserProfile';
import { useProfile } from '@/providers/profile.provider';
import {useNetwork} from '@/providers/network.provider'

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
  
  const {isOffline, toggleOffline} = useNetwork();

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
    { label: 'Osiągnięcia', icon: 'trophy-outline' },
    { label: 'Zaproś znajomych', icon: 'share-social-outline' },
    { label: isOffline ? 'Tryb online' : 'Tryb offline', icon: isOffline ? 'cloud-outline' : 'cloud-offline-outline' },
    { label: 'Wyloguj się', icon: 'log-out-outline' },
  ] as const;

  const onMenuItemPress = useCallback(
    (label: typeof menuItems[number]['label']) => {
      if (label === 'Edytuj profil') {
        setIsEditModalVisible(true);
        return;
      }
      if (label === 'Tryb offline' || label === 'Tryb online') {
        console.log(isOffline ? 'Tryb online' : 'Tryb offline');
        toggleOffline();
        return;
      }
      if (label === 'Wyloguj się') {
        signOut('manual');
      }
    },
    [signOut, toggleOffline]
  );

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
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

      {/* --- MODAL EDYCJI --- */}
      <EditProfileModal
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
});