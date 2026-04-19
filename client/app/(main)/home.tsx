import React from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../styles/colors';
import ScreenHeader from '../../components/ScreenHeader';

export default function Home() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];

  // Bezpieczny margines na dole (Pasek + system + oddech)
  const bottomPadding = 65 + (insets.bottom > 0 ? insets.bottom : 10) + 30;

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <ScreenHeader 
        showLogo={true} 
        onNotificationPress={() => console.log('Powiadomienia')} 
        onProfilePress={() => console.log('Profil')} 
      />

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: currentColors.text }]}>Witaj z powrotem!</Text>
        <Text style={[styles.subtitle, { color: currentColors.subtext }]}>Gdzie tym razem się wybieramy?</Text>
        
        {/* Przykładowe karty */}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((item) => (
          <View key={item} style={[styles.card, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
            <Text style={{ color: currentColors.text, fontWeight: 'bold' }}>Zapisana trasa {item}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, marginBottom: 30 },
  card: { height: 120, borderRadius: 16, borderWidth: 1, marginBottom: 16, justifyContent: 'center', alignItems: 'center' }
});