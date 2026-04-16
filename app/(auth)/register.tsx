import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import Logo from '../../assets/images/WhereWeGoingLogo.png';
import GradientButton from '../../components/gradientButton';
import { Colors } from '../../styles/colors';
import { styles } from '../../styles/register.styles';
import GoogleLogo from '../../assets/images/google-g-logo.png';

export default function Register() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];

  const [viewMode, setViewMode] = useState<'selection' | 'email'>('selection');
  const [showPassword, setShowPassword] = useState(false);

  const handleBack = () => {
    if (viewMode === 'email') setViewMode('selection');
    else router.back();
  };

  return (
    // ZMIANA TUTAJ: Zwykły View zamiast KeyboardAvoidingView
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* ZMIANA TUTAJ: Zwykły View zamiast ScrollView */}
      <View style={styles.content}>
        
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={currentColors.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Image source={Logo} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.title, { color: currentColors.text }]}>
            {viewMode === 'selection' ? 'Zacznijmy!' : 'Utwórz konto'}
          </Text>
          <Text style={[styles.subtitle, { color: currentColors.subtext }]}>
            {viewMode === 'selection' 
              ? 'Wybierz najwygodniejszą dla Ciebie metodę rejestracji' 
              : 'Wpisz swoje dane, aby kontynuować'}
          </Text>
        </View>

        {viewMode === 'selection' ? (
          <View style={styles.selectionGap}>
            <TouchableOpacity 
              style={[styles.socialButtonLarge, { backgroundColor: currentColors.card, borderColor: currentColors.border, borderWidth: 1 }]}
              onPress={() => setViewMode('email')}
            >
              <Ionicons name="mail-outline" size={24} color={Colors.brand.blue} />
              <Text style={[styles.socialButtonText, { color: currentColors.text }]}>Zarejestruj się przez e-mail</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.socialButtonLarge, { backgroundColor: '#ffffff', borderColor: '#ddd', borderWidth: 1 }]}>
              <Image source={GoogleLogo} style={{ width: 22, height: 22 }} resizeMode="contain" />
              <Text style={[styles.socialButtonText, { color: '#000'}]}>Kontynuuj przez Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.socialButtonLarge, { backgroundColor: '#1877F2', borderColor: '#1877F2', borderWidth: 1 }]}>
              <Ionicons name="logo-facebook" size={24} color="#ffffff" />
              <Text style={[styles.socialButtonText, { color: '#ffffff' }]}>Kontynuuj przez Facebook</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <View style={[styles.inputContainer, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
                <Ionicons name="person-outline" size={20} color={currentColors.subtext} style={styles.inputIcon} />
                <TextInput style={[styles.input, { color: currentColors.text }]} placeholder="Imię i Nazwisko" placeholderTextColor={currentColors.subtext} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={[styles.inputContainer, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
                <Ionicons name="mail-outline" size={20} color={currentColors.subtext} style={styles.inputIcon} />
                <TextInput style={[styles.input, { color: currentColors.text }]} placeholder="Adres e-mail" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={currentColors.subtext} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={[styles.inputContainer, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={currentColors.subtext} style={styles.inputIcon} />
                <TextInput style={[styles.input, { color: currentColors.text }]} placeholder="Hasło" secureTextEntry={!showPassword} placeholderTextColor={currentColors.subtext} />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={currentColors.subtext} />
                </TouchableOpacity>
              </View>
            </View>

            <GradientButton title="Utwórz konto" onPress={() => {}} style={{ marginTop: 10 }} />
          </View>
        )}

        <View style={styles.footerBase}>
          <TouchableOpacity style={styles.loginPrompt} onPress={() => router.push('/(auth)/login')}>
            <Text style={{ color: currentColors.subtext }}>
              Masz już konto? <Text style={{ color: Colors.brand.blue, fontWeight: 'bold' }}>Zaloguj się</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}