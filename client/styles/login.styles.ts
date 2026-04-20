import { Dimensions, StyleSheet } from 'react-native';

const { height } = Dimensions.get('window');

const isSmallDevice = height < 700;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  
  // --- Nagłówek i Nawigacja ---
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginVertical: isSmallDevice ? 10 : 20,
  },
  logo: {
    width: '85%',
    maxWidth: 320,
    height: 50,
    marginBottom: 10,
  },
  title: {
    fontSize: isSmallDevice ? 28 : 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: isSmallDevice ? 10 : 20,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
  },

  // --- Ciało i Formularz ---
  body: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 20,
  },
  form: {
    width: '100%',
  },
  // ZMIANA: Dodano inputGroup dla stabilizacji układu
  inputGroup: {
    minHeight: 80, // Stała rezerwacja miejsca na input + ew. błąd
    justifyContent: 'flex-start',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    // Usunięto marginBottom: 16 (przejął go inputGroup)
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  eyeIcon: {
    padding: 5,
  },
  // ZMIANA: Dodano styl błędu
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginLeft: 12,
    marginTop: 4,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
    marginTop: -4, 
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF', 
  },

  // --- Sekcja "LUB" ---
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 30,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
  },

  // --- Logowanie Social ---
  socialRow: {
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
    gap: 32, 
  },
  socialButtonSmall: {
    width: 120, 
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  // --- Stopka ---
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  footerText: {
    padding: 10,
  },
});