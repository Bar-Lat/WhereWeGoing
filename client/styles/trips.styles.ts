import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  scrollContent: { 
    paddingHorizontal: 20,
    // gap pozwala na łatwe robienie przerw między kartami w liście
    gap: 20, 
  },

  // --- ZAPOŻYCZONY STYL KARTY HERO Z EKRANU GŁÓWNEGO ---
  heroCard: { 
    height: 210, 
    borderRadius: 24, 
    overflow: 'hidden', 
    elevation: 8, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 10 
  },
  heroImage: { 
    width: '100%', 
    height: '100%' 
  },
  heroOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.35)' 
  },
  heroBottom: { 
    position: 'absolute', 
    bottom: 20, 
    left: 20, 
    right: 20 
  },
  heroSubtitleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    marginBottom: 6 
  },
  heroSubtitle: { 
    color: 'rgba(255,255,255,0.9)', 
    fontSize: 13, 
    fontWeight: '500' 
  },
  heroMainRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  heroDestination: { 
    color: 'white', 
    fontSize: 26, 
    fontWeight: '800', 
    marginBottom: 4 
  },
  heroDates: { 
    color: 'rgba(255,255,255,0.8)', 
    fontSize: 13 
  },
  heroArrow: { 
    width: 38, 
    height: 38, 
    borderRadius: 19, 
    backgroundColor: 'rgba(255,255,255,0.25)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  // Badge ze statusem
  daysBadge: { 
    position: 'absolute', 
    top: 16, 
    right: 16, 
    backgroundColor: 'rgba(255,255,255,0.25)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6 
  },
  daysBadgeText: { 
    color: 'white', 
    fontSize: 12, 
    fontWeight: '700' 
  },
  pulseDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    // Domyślny kolor, ale nadpisujemy go inline z getTripStatusInfo
    backgroundColor: '#34C759' 
  },
});