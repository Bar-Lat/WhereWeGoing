import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import Logo from '../../assets/images/WhereWeGoingLogo.png';
import { styles } from '../../styles/welcome.styles';

export default function Welcome() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Hide the navigation header for the welcome screen */}
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.content}>
        <Image source={Logo} style={styles.logo} />
        <Text style={styles.subtitle}>
          Plan your next adventure. Explore the world with your friends.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => router.push('/register')}
        >
          <Text style={styles.primaryButtonText}>Create Account</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.secondaryButtonText}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
