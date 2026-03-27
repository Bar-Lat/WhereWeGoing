import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECECEC',
    justifyContent: 'space-between',
    padding: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 280,
    height: 90,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  subtitle: {
    color: '#a0a0a0',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footer: {
    width: '100%',
    paddingBottom: 40,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#2c2c2c', // Matching your map middle button color
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#a0a0a0',
    fontSize: 14,
    fontWeight: '600',
  },
});