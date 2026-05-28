import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Text, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/styles/colors';
import Logo from '@/assets/images/WhereWeGoingLogo.png';
import { useNetwork } from '@/providers/network.provider';

interface ScreenHeaderProps {
  // Wariant nagłówka
  variant?: 'default' | 'dashboard' | 'inspiration' | 'trips';
  
  showLogo?: boolean;
  title?: string;
  
  userName?: string;
  userInitials?: string;
  onSearchFocus?: () => void;
  tripCount?: number;

  showNotifications?: boolean;
  onNotificationPress?: () => void;
  showProfile?: boolean;
  onProfilePress?: () => void;
  userAvatarUrl?: string | null;

  hasUnreadNotifications?: boolean;
}

export default function ScreenHeader({ 
  variant = 'default',
  showLogo = false, 
  title, 
  userInitials = "U",
  showNotifications = true,
  onNotificationPress,
  showProfile = true,
  onProfilePress,
  userAvatarUrl,
  hasUnreadNotifications = false,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { isOffline } = useNetwork();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];

  const offlineTopOffset = isOffline ? 42 : 0;

  // --- WARIANT 1: DASHBOARD (Home) ---
  if (variant === 'dashboard') {
    return (
      <LinearGradient
        colors={Colors.brand.logoGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.dashboardHeader, { paddingTop: insets.top + 10 + offlineTopOffset }]}
      >
        <View style={styles.dashboardTop}>
          <View>
            <Text style={styles.bigText}>Dzień dobry</Text>
            <Text style={styles.subText}>Co dziś robimy?</Text>
          </View>
          <View style={styles.dashboardIcons}>
            {showNotifications && (
              <TouchableOpacity style={styles.iconCircle} onPress={onNotificationPress}>
                <Ionicons name="notifications-outline" size={22} color="white" />
                {hasUnreadNotifications && <View style={styles.notificationDot} />}
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onProfilePress}>
              {userAvatarUrl ? (
                <Image source={{ uri: userAvatarUrl }} style={styles.dashboardAvatar} />
              ) : (
                <View style={[styles.dashboardAvatar, { borderColor: 'rgba(255,255,255,0.3)', borderWidth: 1 }]}>
                  <Text style={styles.avatarText}>{userInitials}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }  

  // --- WARIANT 2: INSPIRATION ---
  if (variant === 'inspiration') {
    return (
      <LinearGradient
        colors={Colors.brand.logoGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.dashboardHeader, { paddingTop: insets.top + 10 + offlineTopOffset }]}
      >
        <View style={styles.dashboardTop}>
          <View>
            <Text style={styles.bigText}>Zainspiruj się</Text>
            <Text style={styles.subText}>Odkrywaj popularne kierunki</Text>
          </View>
          <View style={styles.dashboardIcons}>
            {showNotifications && (
              <TouchableOpacity style={styles.iconCircle} onPress={onNotificationPress}>
                <Ionicons name="notifications-outline" size={22} color="white" />
                <View style={styles.notificationDot} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onProfilePress}>
              {userAvatarUrl ? (
                <Image source={{ uri: userAvatarUrl }} style={styles.dashboardAvatar} />
              ) : (
                <View style={[styles.dashboardAvatar, { borderColor: 'rgba(255,255,255,0.3)', borderWidth: 1 }]}>
                  <Text style={styles.avatarText}>{userInitials}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }

  // --- WARIANT 3: TRIPS (Moje Plany) - SPÓJNY Z RESZTĄ ---
  if (variant === 'trips') {
    return (
      <LinearGradient
        colors={Colors.brand.logoGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.dashboardHeader, { paddingTop: insets.top + 10 + offlineTopOffset}]}
      >
        <View style={styles.dashboardTop}>
          <View>
            <Text style={styles.bigText}>{title || "Twoje Podróże"}</Text>
            <Text style={styles.subText}>Zarządzaj swoimi planami</Text>
          </View>
          <View style={styles.dashboardIcons}>
            {showNotifications && (
              <TouchableOpacity style={styles.iconCircle} onPress={onNotificationPress}>
                <Ionicons name="notifications-outline" size={22} color="white" />
                <View style={styles.notificationDot} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onProfilePress}>
              {userAvatarUrl ? (
                <Image source={{ uri: userAvatarUrl }} style={styles.dashboardAvatar} />
              ) : (
                <View style={[styles.dashboardAvatar, { borderColor: 'rgba(255,255,255,0.3)', borderWidth: 1 }]}>
                  <Text style={styles.avatarText}>{userInitials}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }

  // --- WARIANT 4: DOMYŚLNY (Inne zakładki np. Profil) ---
  return (
    <View style={[
      styles.defaultHeader, 
      { 
        paddingTop: insets.top > 0 ? insets.top + 10 + offlineTopOffset : 30 + offlineTopOffset, 
        backgroundColor: currentColors.card,
        borderBottomColor: currentColors.border 
      }
    ]}>
      <View style={styles.leftContainer}>
        {showLogo ? (
          <Image source={Logo} style={styles.logo} resizeMode="contain" />
        ) : (
          <Text style={[styles.title, { color: currentColors.text }]}>{title}</Text>
        )}
      </View>

      <View style={styles.rightContainer}>
        {showNotifications && (
          <TouchableOpacity style={styles.headerButton} onPress={onNotificationPress}>
            <Ionicons name="notifications-outline" size={24} color={currentColors.text} />
          </TouchableOpacity>
        )}
        {showProfile && (
          <TouchableOpacity style={styles.headerButton} onPress={onProfilePress}>
            {userAvatarUrl ? (
              <Image source={{ uri: userAvatarUrl }} style={[styles.defaultAvatar, { borderColor: currentColors.border }]} />
            ) : (
              <Ionicons name="person-circle-outline" size={28} color={currentColors.text} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Style dla wariantu Default
  defaultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, zIndex: 10, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  leftContainer: { flex: 1, justifyContent: 'center' },
  rightContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  logo: { width: 160, height: 40 },
  title: { fontSize: 22, fontWeight: 'bold' },
  headerButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  defaultAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1 },

  // WSPÓLNE STYLE DLA Dashboard, Inspiration i Trips
  dashboardHeader: { paddingHorizontal: 20, paddingBottom: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  dashboardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  subText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 2 },
  bigText: { color: 'white', fontSize: 24, fontWeight: '800' },
  dashboardIcons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  notificationDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30' },
  dashboardAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 16, fontWeight: '700' },
});