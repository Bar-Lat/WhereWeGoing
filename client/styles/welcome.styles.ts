import { Dimensions, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
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
    paddingHorizontal: isSmallDevice ? 16 : 24,
  },
  slideContainer: {
    width: width - (isSmallDevice ? 32 : 48),
    height: height * 0.55, 
    minHeight: 320,
    maxHeight: 500,
    borderRadius: 32,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: isSmallDevice ? 20 : 32,
    // Dodany cień dla kafelka
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  slideImage: {
    // Rozciągnięcie na pełny ekran kafelka, aby wyeliminować białe marginesy
    ...StyleSheet.absoluteFillObject,
    width: '130%', 
    height: '120%',
    resizeMode: 'cover',
  },
  slideGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  slideTextWrapper: {
    zIndex: 10,
  },
  slideTitle: {
    color: '#ffffff',
    fontSize: isSmallDevice ? 26 : 32,
    fontWeight: 'bold',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  slideDescription: {
    color: '#f0f0f0',
    fontSize: isSmallDevice ? 14 : 16,
    lineHeight: isSmallDevice ? 20 : 22,
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  welcomeMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    gap: 6,
  },
  welcomeMetaText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
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