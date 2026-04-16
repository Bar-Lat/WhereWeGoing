import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../styles/colors'; // Importujemy Twoje nowe stałe

interface GradientButtonProps {
  onPress: () => void;
  title: string;
  style?: ViewStyle;
}

export default function GradientButton({ onPress, title, style }: GradientButtonProps) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.wrapper, style]} activeOpacity={0.8}>
      <LinearGradient
        // Używamy gotowej tablicy z pliku colors.ts
        colors={Colors.brand.logoGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Text style={styles.text}>{title}</Text>
        
        {/* Połysk - zostawiamy jako delikatny detal */}
        <LinearGradient
          colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']}
          style={styles.gloss}
        />
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
    height: 58, // Nieco wyższy, by wyglądał solidniej
    borderRadius: 29, 
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700', // Pogrubienie dla lepszej czytelności na gradiencie
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