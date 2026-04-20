import { Dimensions, StyleSheet } from 'react-native';
import { Colors } from './colors';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Wyróżniona Karta (Hero)
  heroSection: { paddingHorizontal: 20, marginTop: -25, marginBottom: 24, zIndex: 10 },
  featuredCard: { height: 220, borderRadius: 24, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 10 },
  featuredImage: { width: '100%', height: '100%' },
  featuredOverlay: { ...StyleSheet.absoluteFillObject },
  featuredTopBadge: { position: 'absolute', top: 16, left: 16, backgroundColor: Colors.brand.blue, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  featuredBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  featuredBottom: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  featuredTitle: { color: 'white', fontSize: 28, fontWeight: '800', marginBottom: 4 },
  featuredSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 12 },
  priceTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  priceText: { color: 'white', fontSize: 13, fontWeight: '700' },

  // Sekcje wspólne
  section: { marginBottom: 24 },
  sectionHeading: { fontSize: 18, fontWeight: '700', paddingHorizontal: 20, marginBottom: 16 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  seeAllText: { color: Colors.brand.blue, fontSize: 14, fontWeight: '600' },

  // Kategorie (Poziomy scroll)
  categoriesScroll: { paddingHorizontal: 20, gap: 12 },
  categoryBtn: { flexDirection: 'row', alignItems: 'center', padding: 8, paddingRight: 16, borderRadius: 20, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  categoryIconBox: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  categoryText: { fontSize: 14, fontWeight: '600' },

  // Siatka Popularnych (Grid)
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 20 },
  // Szerokość to połowa ekranu minus marginesy (20 po bokach + 15 przerwy między nimi)
  gridItem: { width: (width - 55) / 2, height: 200, borderRadius: 20, overflow: 'hidden', marginBottom: 15 },
  gridImage: { width: '100%', height: '100%' },
  gridOverlay: { ...StyleSheet.absoluteFillObject },
  gridInfo: { position: 'absolute', bottom: 15, left: 15, right: 15 },
  gridDestName: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  gridCountryRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gridCountry: { color: 'rgba(255,255,255,0.8)', fontSize: 12 }
});