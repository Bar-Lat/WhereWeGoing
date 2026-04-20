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

  const accessToken = session?.access_token ?? null;


  useEffect(() => {
    setAvatarLoadError(false);
  }, [profile?.avatar]);

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
    'Edytuj profil',
    'Moje statystyki',
    'Osiągnięcia',
    'Zaproś znajomych',
    'Wyloguj się',
  ] as const;

  const onMenuItemPress = useCallback(
    (item: (typeof menuItems)[number]) => {
      if (item === 'Edytuj profil') {
        setIsEditModalVisible(true);
        return;
      }

      if (item === 'Wyloguj się') {
        signOut('manual');
      }
    },
    [signOut]
  );

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <ScreenHeader title="Moj Profil" />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}>
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.brand.blue} />
          </View>
        ) : (
          <>
            <View style={styles.profileHeader}>
              <View style={styles.avatarWrapper}>
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
              </View>

              <Text style={[styles.userName, { color: currentColors.text }]}>{userNameLabel}</Text>
              <Text style={[styles.userEmail, { color: currentColors.subtext }]}>{emailLabel}</Text>
            </View>

            <View
              style={[
                styles.menuContainer,
                { backgroundColor: currentColors.card, borderColor: currentColors.border },
              ]}
            >
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => onMenuItemPress(item)}
                  style={[
                    styles.menuItem,
                    index !== menuItems.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: currentColors.border,
                    },
                  ]}
                >
                  <Text style={{ color: item === 'Wyloguj się' ? '#ff4444' : currentColors.text, fontSize: 16 }}>
                    {item}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={currentColors.subtext} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>

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
  scrollContent: { paddingHorizontal: 20, paddingTop: 30 },
  loaderContainer: { paddingTop: 40, alignItems: 'center' },
  profileHeader: { alignItems: 'center', marginBottom: 30 },
  avatarWrapper: { alignItems: 'center', marginBottom: 10 },
  avatarImage: { width: 110, height: 110, borderRadius: 55 },
  avatarFallback: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  userName: { fontSize: 22, fontWeight: 'bold' },
  userEmail: { fontSize: 14, marginTop: 4 },
  menuContainer: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
});