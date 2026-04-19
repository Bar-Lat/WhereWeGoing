import React from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../styles/colors';
import ScreenHeader from '../../components/ScreenHeader';

export default function Trips() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const bottomPadding = 65 + (insets.bottom > 0 ? insets.bottom : 10) + 30;

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <ScreenHeader title="Moje Plany" />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}>
        {/* Symulacja nadchodzącej podróży */}
        <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Nadchodzące</Text>
        <View style={[styles.tripCard, { backgroundColor: currentColors.card, borderColor: Colors.brand.blue, borderWidth: 2 }]}>
          <Text style={{ color: currentColors.text, fontWeight: 'bold', fontSize: 18 }}>Wycieczka do Paryża</Text>
          <Text style={{ color: currentColors.subtext, marginTop: 5 }}>Za 14 dni</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 20 }]}>Zakończone</Text>
        <View style={[styles.tripCard, { backgroundColor: currentColors.card, borderColor: currentColors.border, borderWidth: 1 }]}>
          <Text style={{ color: currentColors.subtext }}>Góry Stołowe (Sierpień 2023)</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  tripCard: { height: 100, borderRadius: 16, padding: 15, marginBottom: 15, justifyContent: 'center' }
});