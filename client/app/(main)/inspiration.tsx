import React from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../styles/colors';
import ScreenHeader from '../../components/ScreenHeader';

export default function Inspiration() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const bottomPadding = 65 + (insets.bottom > 0 ? insets.bottom : 10) + 30;

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <ScreenHeader 
        title="Odkrywaj" 
        rightIconName="search-outline" 
        onRightPress={() => console.log('Szukaj')} 
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}>
        <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Popularne kierunki</Text>
        
        <View style={styles.grid}>
          {[1, 2, 3, 4].map((item) => (
            <View key={item} style={[styles.gridItem, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
              <Text style={{ color: currentColors.subtext }}>Kierunek {item}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', height: 150, borderRadius: 16, borderWidth: 1, marginBottom: 15, justifyContent: 'center', alignItems: 'center' }
});