import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors } from '../styles/colors';

interface GradientButtonProps {
  onPress: () => void;
  title: string;
  style?: ViewStyle;
  loading?: boolean; // Nowy prop: stan ładowania
  disabled?: boolean; // Nowy prop: zablokowanie przycisku
}

export default function GradientButton({ 
  onPress, 
  title, 
  style, 
  loading = false, 
  disabled = false 
}: GradientButtonProps) {
  
  // Przycisk jest zablokowany, jeśli sami go wyłączymy LUB jeśli coś się ładuje
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[styles.wrapper, style, isDisabled && { opacity: 0.7 }]} // Przymglony gdy zablokowany
      activeOpacity={0.8}
      disabled={isDisabled}
    >
      <LinearGradient
        colors={Colors.brand.logoGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {loading ? (
          // Jeśli ładuje, pokazujemy kręciołek zamiast tekstu
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
        
        {/* Połysk wyświetlamy tylko gdy nie ma ładowania, żeby nie zasłaniał spinnera */}
        {!loading && (
          <LinearGradient
            colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']}
            style={styles.gloss}
          />
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  gradient: {
    height: 56,
    borderRadius: 16, 
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%', 
  },
});