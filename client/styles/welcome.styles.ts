import { Dimensions, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

// Prosta funkcja pomocnicza do sprawdzania czy to mały ekran
const isSmallDevice = height < 700;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    // Używamy marginu zamiast sztywnego marginTop: '15%'
    marginTop: isSmallDevice ? 20 : 40,
    zIndex: 20,
  },
  logo: {
    width: '75%', 
    maxWidth: 320,
    height: 50,
  },
  middleContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: width,
    marginVertical: 10,
  },
  slideWrapper: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
    // Zmniejszamy padding na mniejszych urządzeniach
    paddingHorizontal: isSmallDevice ? 16 : 24,
  },
  slideContainer: {
    width: width - (isSmallDevice ? 32 : 48),
    height: height * 0.55, 
    minHeight: 320, // Żeby na bardzo małych nie zrobił się pasek
    maxHeight: 500, // Żeby na iPadach nie był gigantyczny
    borderRadius: 32,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: isSmallDevice ? 20 : 32,
    
  },
  slideImage: {
    position: 'absolute',
    width: '130%', 
    height: '120%',
    resizeMode: 'cover',
  },
  slideGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  slideTitle: {
    color: '#ffffff',
    fontSize: isSmallDevice ? 26 : 32, // Skalujemy font
    fontWeight: 'bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  slideDescription: {
    color: '#f0f0f0',
    fontSize: isSmallDevice ? 14 : 16,
    lineHeight: isSmallDevice ? 20 : 24,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  slideTextWrapper: {
    zIndex: 10,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    width: '100%',
    paddingHorizontal: 24,
    // paddingBottom zostanie obsłużony przez SafeAreaView
    zIndex: 20,
  },
  footerBase: {
    marginTop: 10,
    alignItems: 'center',
  },
  loginPrompt: {
    padding: 10,
  },
});