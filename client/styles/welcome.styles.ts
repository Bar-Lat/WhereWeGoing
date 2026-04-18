import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 20,
  },
  logo: {
    width: '75%', // Skaluje się z ekranem
    maxWidth: 280, // Ale nie będzie większe niż 260px na iPadzie
    height: 60,
    marginTop: '15%',
  },
  middleContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: width,
  },
  
  slideWrapper: {
    width: width, // Cała szerokość ekranu dla poprawnego działania `pagingEnabled`
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24, // Odsuwamy zawartość od krawędzi ekranu
  },
  slideContainer: {
    width: width - 48, // Karta węższa niż ekran o 24px z każdej strony
    height: 420,
    borderRadius: 32, // Mocno zaokrąglone rogi (prostokąt z promieniami)
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 32,
  },
  slideImage: {
    ...StyleSheet.absoluteFillObject,
    width: '130%',
    height: '130%',
    resizeMode: 'cover',
  },
  slideGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  // ------------------
  slideTextWrapper: {
    zIndex: 10,
  },
  slideTitle: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 12
  },
  slideDescription: {
    color: '#f0f0f0',
    fontSize: 16,
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 12
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  // --- Stopka ---
  footer: {
    width: '100%',
    paddingHorizontal: 24,
    gap: 8,
    marginTop: 10,
    zIndex: 20,
    marginBottom: 10,
  },
  footerBase: {
    marginTop: 10,
    alignItems: 'center',
  },
  loginPrompt: {
    padding: 10, // Trochę większy klikalny obszar dla wygody
  },
});