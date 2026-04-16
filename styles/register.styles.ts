import { StyleSheet, Dimensions } from 'react-native';
const { height } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 40,
    justifyContent: 'space-between', // Rozpycha elementy (header na górze, footer na dole)
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
  },
  logo: {
    width: 260,
    height: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 15,
  },
  selectionGap: {
    gap: 16,
    flex: 1,
    justifyContent: 'center', // Centruje przyciski wyboru w pionie
  },
  socialButtonLarge: {
    flexDirection: 'row',
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    // Cień dla iOS/Android
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
    flex: 1,
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 4,
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
  footerBase: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginPrompt: {
    padding: 10,
  },
});