import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Hero Card (Nachodząca karta)
  heroSection: { paddingHorizontal: 20, marginTop: -25, marginBottom: 24, zIndex: 10 },
  heroCard: { height: 210, borderRadius: 24, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 10 },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  heroBottom: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  heroSubtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  heroSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '500' },
  heroMainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroDestination: { color: 'white', fontSize: 26, fontWeight: '800', marginBottom: 4 },
  heroDates: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  heroArrow: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  daysBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  daysBadgeText: { color: 'white', fontSize: 12, fontWeight: '700' },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34C759' },

  // Sekcje ogólne
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionHeading: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  seeAllText: { color: '#007AFF', fontSize: 14, fontWeight: '600' },
  
  // Karta Budżetu
  card: { borderRadius: 20, padding: 18, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 13, fontWeight: '600' },
  cardSubValue: { flexShrink: 1, maxWidth: '48%', textAlign: 'right', fontSize: 12, fontWeight: '500' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  statusOk: { fontSize: 12, color: '#34C759', fontWeight: '600' },
  remainingText: { fontSize: 12 },

  // Szybkie akcje
  quickActionsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  qaButton: { alignItems: 'center', gap: 8, width: '22%' },
  qaIconBox: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  qaLabel: { fontSize: 12, fontWeight: '500' },

  // Harmonogram (Dzisiaj w planie)
  scheduleList: { gap: 12 },
  scheduleItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 20, gap: 14, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  scheduleIcon: { width: 46, height: 46, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  scheduleInfo: { flex: 1 },
  scheduleName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  scheduleTime: { fontSize: 13 },
  scheduleCost: { fontSize: 14, fontWeight: '700' }
});
