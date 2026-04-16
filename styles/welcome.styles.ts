import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 20,
  },
  logo: {
    width: 260,
    height: 60,
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
  // ------------------
  slideTextWrapper: {
    zIndex: 10,
    marginBottom: 20,
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
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    width: '100%',
    paddingHorizontal: 24,
    gap: 8,
    marginTop: 20,
    zIndex: 20,
    marginBottom: 20
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    width: '80%', 
    alignSelf: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});