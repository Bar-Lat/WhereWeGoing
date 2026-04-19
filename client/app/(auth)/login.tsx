import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
  Dimensions,
  Alert 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GoogleLogo from '../../assets/images/google-g-logo.png';
import Logo from '../../assets/images/WhereWeGoingLogo.png';
import GradientButton from '../../components/GradientButton'; 
import { Colors } from '../../styles/colors';
import { styles } from '../../styles/login.styles';

const { height } = Dimensions.get('window');

export default function Login() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);

  // NOWE: Stan dla błędów
  const [errors, setErrors] = useState({ email: '', password: '' });

  const handleBack = () => {
    router.back();
  };

  const handleLogin = () => {
    // 1. Reset błędów
    setErrors({ email: '', password: '' });
    let hasError = false;
    const newErrors = { email: '', password: '' };

    // 2. Walidacja
    if (!email.includes('@') || !email.includes('.')) { 
      newErrors.email = 'Podaj poprawny adres e-mail'; 
      hasError = true; 
    }
    if (!password.trim()) { 
      newErrors.password = 'Wpisz hasło'; 
      hasError = true; 
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    // 3. Właściwe logowanie
    setIsLoading(true);
    // TODO: Zaimplementować logikę logowania (np. Firebase/Supabase/własne API)
    setTimeout(() => {
      setIsLoading(false);
      router.replace('/home'); 
    }, 2000);
  };

  // NOWE: Handler zapomnianego hasła
  const handleForgotPassword = () => {
    setErrors({ email: '', password: '' });
    
    // Zmuszamy użytkownika do wpisania maila, na który mamy wysłać reset
    if (!email.includes('@') || !email.includes('.')) {
      setErrors({ ...errors, email: 'Wpisz swój e-mail, aby zresetować hasło' });
      return;
    }

    // Symulacja wysłania maila (TODO: Podpiąć pod API)
    Alert.alert(
      "Link wysłany!", 
      `Instrukcje resetowania hasła zostały wysłane na adres:\n${email}`,
      [{ text: "OK" }]
    );
  };

  const handleSocialAuth = (provider: 'google' | 'facebook') => {
    setSocialLoading(provider);
    setTimeout(() => {
      setSocialLoading(null);
    }, 2000);
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />  

      <ScrollView 
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 20)
          }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={height < 700} 
      >
        <View style={styles.content}>
          
          <View>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color={currentColors.text} />
            </TouchableOpacity>

            <View style={styles.header}>
              <Image source={Logo} style={styles.logo} resizeMode="contain" />
              <Text style={[styles.title, { color: currentColors.text }]}>Zaloguj się!</Text>
              <Text style={[styles.subtitle, { color: currentColors.subtext }]}>Zaloguj się, aby kontynuować</Text>
            </View>
          </View>

          <View style={styles.body}>
            <View style={styles.form}>
              
              {/* ZMIANA: Input Email otoczony inputGroup z obsługą błędów */}
              <View style={styles.inputGroup}>
                <View style={[styles.inputContainer, { backgroundColor: currentColors.card, borderColor: errors.email ? '#ff4444' : currentColors.border }]}>
                  <Ionicons name="mail-outline" size={20} color={errors.email ? '#ff4444' : currentColors.subtext} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: currentColors.text }]}
                    placeholder="Adres e-mail"
                    placeholderTextColor={currentColors.subtext}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
              </View>

              {/* ZMIANA: Input Hasło otoczony inputGroup z obsługą błędów */}
              <View style={styles.inputGroup}>
                <View style={[styles.inputContainer, { backgroundColor: currentColors.card, borderColor: errors.password ? '#ff4444' : currentColors.border }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={errors.password ? '#ff4444' : currentColors.subtext} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: currentColors.text }]}
                    placeholder="Hasło"
                    placeholderTextColor={currentColors.subtext}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!isPasswordVisible}
                  />
                  <TouchableOpacity onPress={() => setPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon}>
                    <Ionicons 
                      name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={currentColors.subtext} 
                    />
                  </TouchableOpacity>
                </View>
                {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
              </View>

              {/* ZMIANA: Dodano akcję onPress dla zapomnianego hasła */}
              <TouchableOpacity style={styles.forgotPasswordContainer} onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordText}>Zapomniałeś hasła?</Text>
              </TouchableOpacity>

              <GradientButton 
                title="Zaloguj się" 
                onPress={handleLogin} 
                loading={isLoading}
              />

              <View style={styles.dividerContainer}>
                <View style={[styles.divider, { backgroundColor: currentColors.border }]} />
                <Text style={[styles.dividerText, { color: currentColors.subtext }]}>LUB</Text>
                <View style={[styles.divider, { backgroundColor: currentColors.border }]} />
              </View>

              <View style={styles.socialRow}>
                <TouchableOpacity 
                  style={[styles.socialButtonSmall, { backgroundColor: '#ffffff', borderColor: '#ddd' }]}
                  onPress={() => handleSocialAuth('google')}
                  disabled={socialLoading !== null}
                >
                  {socialLoading === 'google' ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Image source={GoogleLogo} style={{ width: 30, height: 30 }} resizeMode="contain" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.socialButtonSmall, { backgroundColor: '#1877F2', borderColor: '#1877F2' }]}
                  onPress={() => handleSocialAuth('facebook')}
                  disabled={socialLoading !== null}
                >
                  {socialLoading === 'facebook' ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Ionicons name="logo-facebook" size={32} color="#ffffff" />
                  )}
                </TouchableOpacity>
              </View>

            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.footerText} onPress={() => router.push('/(auth)/register')}>
              <Text style={{ color: currentColors.subtext }}>
                Nie masz jeszcze konta? <Text style={{ color: Colors.brand.blue, fontWeight: 'bold' }}>Zarejestruj się</Text>
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}