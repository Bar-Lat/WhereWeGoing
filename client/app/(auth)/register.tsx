import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GoogleLogo from '@/assets/images/google-g-logo.png';
import Logo from '@/assets/images/WhereWeGoingLogo.png';
import GradientButton from '@/components/gradientButton';
import {
  registerUser,
} from '@/services/auth.api';
import { useAuth } from '@/providers/auth.provider';
import { Colors } from '@/styles/colors';
import { styles } from '@/styles/register.styles';

export default function Register() {
  const router = useRouter();
  const { signInWithPassword } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  // Zarządzanie widokiem
  const [viewMode, setViewMode] = useState<'selection' | 'email'>('selection');
  
  // Stan wartości z formularza
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Stany ładowania (Loading States)
  const [isRegistering, setIsRegistering] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  // Stan błędów walidacji
  const [errors, setErrors] = useState({ email: '', password: '' });

  // 1. Obsługa powrotu
  
  // Funkcja czyszcząca wszystkie pola i błędy
  const resetForm = () => {
    setEmail('');
    setPassword('');
    setErrors({ email: '', password: '' });
    setIsRegistering(false);
    setShowPassword(false);
  };

  useEffect(() => {
    resetForm();
  }, []);

  const handleBack = () => {
    if (viewMode === 'email') {
      setViewMode('selection');
      resetForm();
    } 
    else {
      resetForm();
      router.push('/(auth)/welcome');
    }
  };

  const handleRegister = async () => {
    setErrors({ email: '', password: '' });
    let hasError = false;
    const newErrors = { email: '', password: '' };

    if (!email.includes('@') || !email.includes('.')) { newErrors.email = 'Podaj poprawny adres e-mail'; hasError = true; }
    if (password.length < 6) { newErrors.password = 'Hasło musi mieć min. 6 znaków'; hasError = true; }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    setIsRegistering(true);

    try {
      await registerUser({
        email,
        password,
      });
      await signInWithPassword(email, password);
      router.replace('/(main)');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udalo sie utworzyc konta';
      setErrors(prev => ({ ...prev, email: message }));
    } finally {
      setIsRegistering(false);
    }
  };

  // Rejestracja Social Media (Google / Apple)
  const handleSocialAuth = (provider: 'google' | 'apple') => {
    setSocialLoading(provider);
    // TODO: Podpiac logowanie social przez backend.
    setTimeout(() => {
      setSocialLoading(null);
    }, 2000);
  };

  // --- ZMIENNY TYTUŁ NAGŁÓWKA ---
  const getHeaderTitle = () => {
    if (viewMode === 'selection') return 'Zacznijmy!';
    if (viewMode === 'email') return 'Utwórz konto';
    return 'Utwórz konto';
  };

  const getHeaderSubtitle = () => {
    if (viewMode === 'selection') return 'Wybierz najwygodniejszą metodę rejestracji';
    if (viewMode === 'email') return 'Wpisz swoje dane, aby kontynuować';
    return 'Wpisz swoje dane, aby kontynuować';
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
        scrollEnabled={false} 
      >
        <View style={styles.content}>
          <View>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color={currentColors.text} />
            </TouchableOpacity>

            <View style={styles.header}>
              <Image source={Logo} style={styles.logo} resizeMode="contain" />
              <Text style={[styles.title, { color: currentColors.text }]}>{getHeaderTitle()}</Text>
              <Text style={[styles.subtitle, { color: currentColors.subtext }]}>{getHeaderSubtitle()}</Text>
            </View>
          </View>

          {/* WIDOK 1: WYBÓR METODY */}
          <View style={[styles.body, viewMode === 'email' ? styles.bodyEmail : null]}>
            {viewMode === 'selection' && (
              <View style={styles.selectionGap}>
                <TouchableOpacity style={[styles.socialButtonLarge, { backgroundColor: currentColors.card, borderColor: currentColors.border, borderWidth: 1 }]} onPress={() => setViewMode('email')}>
                  <Ionicons name="mail-outline" size={24} color={Colors.brand.blue} />
                  <Text style={[styles.socialButtonText, { color: currentColors.text }]}>Zarejestruj się przez e-mail</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.socialButtonLarge, { backgroundColor: '#ffffff', borderColor: '#ddd', borderWidth: 1 }]}
                  onPress={() => handleSocialAuth('google')}
                  disabled={socialLoading !== null}
                >
                  {socialLoading === 'google' ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <Image source={GoogleLogo} style={{ width: 22, height: 22 }} resizeMode="contain" />
                      <Text style={[styles.socialButtonText, { color: '#000'}]}>Kontynuuj przez Google</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.socialButtonLarge, { backgroundColor: '#000000', borderColor: '#000000', borderWidth: 1 }]}
                  onPress={() => handleSocialAuth('apple')}
                  disabled={socialLoading !== null}
                >
                  {socialLoading === 'apple' ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="logo-apple" size={24} color="#ffffff" />
                      <Text style={[styles.socialButtonText, { color: '#ffffff' }]}>Kontynuuj przez Apple</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* WIDOK 2: FORMULARZ EMAIL */}
            {viewMode === 'email' && (
              <View style={[styles.form, styles.formCompact]}>

                {/* EMAIL */}
                <View style={[styles.inputGroup, styles.inputGroupCompact]}>
                  <View style={[styles.inputContainer, { backgroundColor: currentColors.card, borderColor: errors.email ? '#ff4444' : currentColors.border }]}>
                    <Ionicons name="mail-outline" size={20} color={errors.email ? '#ff4444' : currentColors.subtext} style={styles.inputIcon} />
                    <TextInput 
                      style={[styles.input, { color: currentColors.text }]} 
                      placeholder="Adres e-mail" 
                      keyboardType="email-address" 
                      autoCapitalize="none" 
                      placeholderTextColor={currentColors.subtext}
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>
                  {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                </View>

                {/* HASŁO */}
                <View style={[styles.inputGroup, styles.inputGroupCompact]}>
                  <View style={[styles.inputContainer, { backgroundColor: currentColors.card, borderColor: errors.password ? '#ff4444' : currentColors.border }]}>
                    <Ionicons name="lock-closed-outline" size={20} color={errors.password ? '#ff4444' : currentColors.subtext} style={styles.inputIcon} />
                    <TextInput 
                      style={[styles.input, { color: currentColors.text }]} 
                      placeholder="Hasło" 
                      secureTextEntry={!showPassword} 
                      placeholderTextColor={currentColors.subtext}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={currentColors.subtext} />
                    </TouchableOpacity>
                  </View>
                  {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                </View>
                
                <GradientButton title="Utwórz konto" onPress={handleRegister} loading={isRegistering} />
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.footerText} onPress={() => router.push('/(auth)/login')}>
              <Text style={{ color: currentColors.subtext }}>Masz już konto? <Text style={{ color: Colors.brand.blue, fontWeight: 'bold' }}>Zaloguj się</Text></Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}