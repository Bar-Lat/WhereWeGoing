import React from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/styles/colors';
import ScreenHeader from '../../components/ScreenHeader';

export default function Create() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const bottomPadding = 65 + (insets.bottom > 0 ? insets.bottom : 10) + 30;

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <ScreenHeader title="Nowa Podróż" showLogo={true} />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}>
        <Text style={[styles.promptText, { color: currentColors.text }]}>Dokąd chcesz się wybrać?</Text>
        
        {/* Miejsce na formularz (dokąd, od kiedy do kiedy, z kim) */}
        <View style={[styles.formPlaceholder, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
          <Text style={{ color: currentColors.subtext }}>[ Formularz tworzenia trasy ]</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 30, alignItems: 'center' },
  promptText: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  formPlaceholder: { width: '100%', height: 300, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed' }
});