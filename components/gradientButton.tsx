import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientButtonProps {
  onPress: () => void;
  title: string;
  style?: ViewStyle; // Opcjonalne dodatkowe style dla kontenera
}

export default function GradientButton({ onPress, title, style }: GradientButtonProps) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.wrapper, style]}>
      {/* LinearGradient jest tłem. 
        'colors' to tablica kolorów gradientu (niebieski -> turkus -> żółty)
        'start' i 'end' definiują kierunek (od lewego-górnego rogu do prawego-dolnego)
      */}
      <LinearGradient
        colors={['#498ee6', '#20a079',  '#e4d03f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Text style={styles.text}>{title}</Text>
        
        {/* Lekki połysk/refleks na górze */}
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
    // Stylizacja cienia dla iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    // Stylizacja cienia dla Androida
    elevation: 8,
    overflow: 'visible', // Aby cień był widoczny
  },
  gradient: {
    height: 55, // Dostosuj wysokość
    borderRadius: 27.5, // Połowa wysokości dla idealnego zaokrąglenia
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30, // Margines boczny dla tekstu
    overflow: 'hidden', // Aby zaokrąglić rogi gradientu i połysku
  },
  text: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    // Delikatny cień tekstu dla lepszej czytelności (opcjonalne)
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%', // Zajmuje górną połowę przycisku
    opacity: 0.5, // Stopień przezroczystości
  },
});