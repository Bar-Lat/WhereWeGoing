import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Image, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import Logo from '../../assets/images/WhereWeGoingLogo.png';
import { styles } from '../../styles/welcome.styles';
import { Colors } from "../../styles/colors";

// 1. Importujemy Twój nowy przycisk z gradientem
import GradientButton from '../../components/gradientButton';

export default function Welcome() {
  const router = useRouter();
  
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.content}>
        <Image source={Logo} style={styles.logo} resizeMode="contain" />
        
        <Text style={[styles.subtitle, { color: currentColors.subtext }]}>
          Plan your next adventure. Explore the world with your friends.
        </Text>
      </View>

      <View style={styles.footer}>
        {/* przycisk create account */}
        <GradientButton 
          title="Create an account"
          onPress={() => router.push('/(auth)/register')}
          style={{ marginBottom: 15 }} 
        />
        
        <TouchableOpacity 
          style={[
            styles.secondaryButton, 
            { backgroundColor: currentColors.card, borderColor: currentColors.border }
          ]}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={[styles.secondaryButtonText, { color: currentColors.text }]}>
            I already have an account
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}