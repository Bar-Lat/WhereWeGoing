import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import GoogleLogo from '../../assets/images/google-g-logo.png';
import Logo from '../../assets/images/WhereWeGoingLogo.png';
import GradientButton from '../../components/gradientButton';
import { Colors } from '../../styles/colors';
import { styles } from '../../styles/register.styles';

export default function Register() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];

  // Zarządzanie widokiem
  const [viewMode, setViewMode] = useState<'selection' | 'email' | 'verification'>('selection');
  
  // Stan wartości z formularza
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Stany ładowania (Loading States)
  const [isRegistering, setIsRegistering] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);

  // Stan błędów walidacji
  const [errors, setErrors] = useState({ name: '', email: '', password: '', code: '' });

  // 1. Obsługa powrotu
  
  // Funkcja czyszcząca wszystkie pola i błędy
  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setCode('');
    setErrors({ name: '', email: '', password: '', code: '' });
    setIsRegistering(false);
    setIsVerifying(false);
    setShowPassword(false);
  };

  const handleBack = () => {
    if (viewMode === 'verification') {
      setViewMode('email');
      setCode(''); 
      setErrors(prev => ({ ...prev, code: '' }));
    } 
    else if (viewMode === 'email') {
      setViewMode('selection');
      resetForm();
    } 
    else {
      resetForm();
      router.back();
    }
  };

  // TODO: Dodać obsługę błędów z API i wyświetlać je w UI (np. "E-mail już istnieje", "Nie można połączyć się z serwerem" itp.)
  const handleRegister = () => {
    setErrors({ name: '', email: '', password: '', code: '' });
    let hasError = false;
    const newErrors = { name: '', email: '', password: '', code: '' };

    if (!name.trim()) { newErrors.name = 'Nazwa jest wymagana'; hasError = true; }
    if (!email.includes('@') || !email.includes('.')) { newErrors.email = 'Podaj poprawny adres e-mail'; hasError = true; }
    if (password.length < 6) { newErrors.password = 'Hasło musi mieć min. 6 znaków'; hasError = true; }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    setIsRegistering(true);
    
    // TODO: Zaimplementować rejestrację przez API 
    setTimeout(() => {
      setIsRegistering(false);
      setViewMode('verification');
    }, 1500); 
  };

  // TODO: Dodać obsługę błędów z API i wyświetlać je w UI (np. "Nieprawidłowy kod", "Kod wygasł" itp.)
  const handleVerifyCode = () => {
    setErrors({ ...errors, code: '' });

    if (code.length !== 6) {
      setErrors({ ...errors, code: 'Kod musi składać się z 6 cyfr' });
      return;
    }

    setIsVerifying(true);

    // TODO: Zaimplementować weryfikację kodu przez API
    setTimeout(() => {
      setIsVerifying(false);
      
      // Jeśli sukces -> Przekierowanie do głównej aplikacji
      // router.replace('/(tabs)/home'); 
    }, 1500);
  };

  // Ponowne wysłanie kodu
  const handleResendCode = () => {
    setIsResending(true);

    // TODO: Zaimplementować ponowne wysłanie kodu przez API
    setTimeout(() => {
      setIsResending(false);
    }, 1000);
  };

  // Rejestracja Social Media (Google / Facebook)
  const handleSocialAuth = (provider: 'google' | 'facebook') => {
    setSocialLoading(provider);

    // TODO: Zaimplementować autoryzację social media przez API (np. GoogleSignin.signIn() lub Supabase/Firebase OAuth)
    setTimeout(() => {
      setSocialLoading(null);
      // router.replace('/(tabs)/home'); 
    }, 2000);
  };

  // --- ZMIENNY TYTUŁ NAGŁÓWKA ---
  const getHeaderTitle = () => {
    if (viewMode === 'selection') return 'Zacznijmy!';
    if (viewMode === 'email') return 'Utwórz konto';
    return 'Weryfikacja';
  };

  const getHeaderSubtitle = () => {
    if (viewMode === 'selection') return 'Wybierz najwygodniejszą dla Ciebie metodę rejestracji';
    if (viewMode === 'email') return 'Wpisz swoje dane, aby kontynuować';
    return 'Potwierdź swój adres e-mail';
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={currentColors.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Image source={Logo} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.title, { color: currentColors.text }]}>{getHeaderTitle()}</Text>
          <Text style={[styles.subtitle, { color: currentColors.subtext }]}>{getHeaderSubtitle()}</Text>
        </View>

        {/* WIDOK 1: WYBÓR METODY */}
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
              style={[styles.socialButtonLarge, { backgroundColor: '#1877F2', borderColor: '#1877F2', borderWidth: 1 }]}
              onPress={() => handleSocialAuth('facebook')}
              disabled={socialLoading !== null}
            >
              {socialLoading === 'facebook' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="logo-facebook" size={24} color="#ffffff" />
                  <Text style={[styles.socialButtonText, { color: '#ffffff' }]}>Kontynuuj przez Facebook</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* WIDOK 2: FORMULARZ EMAIL */}
        {viewMode === 'email' && (
          <View style={styles.form}>
            {/* Imię */}
            <View style={styles.inputGroup}>
              <View style={[styles.inputContainer, { backgroundColor: currentColors.card, borderColor: errors.name ? '#ff4444' : currentColors.border }]}>
                <Ionicons name="person-outline" size={20} color={errors.name ? '#ff4444' : currentColors.subtext} style={styles.inputIcon} />
                <TextInput 
                  style={[styles.input, { color: currentColors.text }]} 
                  placeholder="Nazwa użytkownika" 
                  autoCapitalize="none"
                  placeholderTextColor={currentColors.subtext}
                  value={name}
                  onChangeText={setName}
                />
              </View>
              {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
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

            {/* Hasło */}
            <View style={styles.inputGroup}>
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
            
            {/* Przycisk Rejestracji */}
            <GradientButton 
              title="Utwórz konto" 
              onPress={handleRegister} 
              loading={isRegistering} // Przekazujesz stan ładowania
            />
          </View>
        )}

        {/* WIDOK 3: WERYFIKACJA KODU */}
        {viewMode === 'verification' && (
          <View style={styles.form}>
            <Text style={[styles.verificationText, { color: currentColors.text }]}>
              Wysłaliśmy 6-cyfrowy kod weryfikacyjny na adres:
            </Text>
            <Text style={[styles.verificationEmail, { color: Colors.brand.blue }]}>{email}</Text>
            
            <View style={styles.inputGroup}>
              <View style={[styles.inputContainer, { 
                backgroundColor: currentColors.card, 
                borderColor: errors.code ? '#ff4444' : currentColors.border, 
                justifyContent: 'center' 
              }]}>
                <TextInput
                  style={[styles.input, { color: currentColors.text, textAlign: 'center', fontSize: 24, letterSpacing: 8 }]}
                  placeholder="000000"
                  keyboardType="numeric"
                  maxLength={6}
                  value={code}
                  onChangeText={setCode}
                  placeholderTextColor={currentColors.subtext}
                />
              </View>
              {errors.code ? <Text style={[styles.errorText, { textAlign: 'center', marginLeft: 0 }]}>{errors.code}</Text> : null}
            </View>
            
            <GradientButton 
              title="Zweryfikuj" 
              onPress={handleVerifyCode} 
              loading={isVerifying} 
            />
            
            <TouchableOpacity 
              style={{ marginTop: 15, alignItems: 'center' }}
              onPress={handleResendCode}
              disabled={isResending}
            >
              {isResending ? (
                <ActivityIndicator color={Colors.brand.blue} size="small" />
              ) : (
                <Text style={{ color: currentColors.subtext }}>
                  Nie dostałeś kodu? <Text style={{ color: Colors.brand.blue, fontWeight: 'bold' }}>Wyślij ponownie</Text>
                </Text>
              )}
            </TouchableOpacity>
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