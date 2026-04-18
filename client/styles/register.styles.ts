import { Dimensions, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

// Prosta funkcja pomocnicza do sprawdzania czy to mały ekran
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
  body: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 20,
  },
  selectionGap: {
    gap: 16,
  },
  socialButtonLarge: {
    flexDirection: 'row',
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  form: {
    gap: 12,
  },
  inputGroup: {
    height: isSmallDevice ? 75 : 85, 
    justifyContent: 'flex-start',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  footerText: {
    padding: 10,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginLeft: 12,
    marginTop: 2,
  },
  verificationText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 5,
  },
  verificationEmail: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
});