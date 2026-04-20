import React from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/styles/colors';
import ScreenHeader from '@/components/ScreenHeader';
import { useAuth } from '@/providers/auth.provider';
import { Ionicons } from '@expo/vector-icons';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const { signOut } = useAuth();
  const bottomPadding = 65 + (insets.bottom > 0 ? insets.bottom : 10) + 30;

  const menuItems = [
    'Edytuj profil',
    'Moje statystyki',
    'Osiągnięcia',
    'Zaproś znajomych',
    'Wyloguj się',
  ] as const;

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <ScreenHeader 
        title="Mój Profil" 
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}>
        
        {/* Głowa profilu */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: Colors.brand.blue }]}>
            <Text style={styles.avatarText}>JD</Text>
          </View>
          <Text style={[styles.userName, { color: currentColors.text }]}>Jan Kowalski</Text>
          <Text style={[styles.userEmail, { color: currentColors.subtext }]}>jan.kowalski@example.com</Text>
        </View>

        {/* Opcje menu profilu */}
        <View style={[styles.menuContainer, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item}
              onPress={item === 'Wyloguj się' ? () => signOut('manual') : undefined}
              style={[styles.menuItem, index !== menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: currentColors.border }]}
            >
              <Text style={{ color: item === 'Wyloguj się' ? '#ff4444' : currentColors.text, fontSize: 16 }}>{item}</Text>
              <Ionicons name="chevron-forward" size={20} color={currentColors.subtext} />
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 30 },
  profileHeader: { alignItems: 'center', marginBottom: 30 },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  userName: { fontSize: 22, fontWeight: 'bold' },
  userEmail: { fontSize: 14, marginTop: 4 },
  menuContainer: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }
});