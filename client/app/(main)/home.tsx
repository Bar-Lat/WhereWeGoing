import React from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, 
  Image, useColorScheme 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/styles/colors';
import { styles } from '@/styles/home.styles';
import ScreenHeader from '../../components/ScreenHeader';
import { useCurrentUserProfile } from '@/hooks/useCurrentUserProfile';

const MOCK_TRIP = {
  destination: "Paryż",
  start_date: "12 Cze",
  end_date: "18 Cze",
  travelers: 2, // liczba podróżnych
  days_left: 79, // liczba dni do wyjazdu
  spent: 1250,
  budget: 3000,
  image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1000&auto=format&fit=crop',
  schedule: [
    { id: '1', name: 'Wieża Eiffla', time: '10:00', duration: 120, type: 'attraction', cost: 120 },
    { id: '2', name: 'Le Comptoir', time: '13:30', duration: 90, type: 'restaurant', cost: 250 },
  ]
};

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const { userAvatarUrl, userInitials } = useCurrentUserProfile();
  
  const bottomPadding = 65 + (insets.bottom > 0 ? insets.bottom : 10) + 20;

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        // Ustawiamy padding na dole, ale górę zostawiamy na 0, bo ScreenHeader sam ogarnia notcha!
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        
        {/* ZMIANA: Nagłówek jest teraz W ŚRODKU ScrollView */}
        <ScreenHeader 
          variant="dashboard"
          userInitials={userInitials}
          onSearchFocus={() => router.push('/(main)/create')}
          onNotificationPress={() => console.log('Powiadomienia')}
          onProfilePress={() => router.push('/(main)/profile')}
          userAvatarUrl={userAvatarUrl}
        />

        {/* --- NACHODZĄCA KARTA --- */}
        {/* Dodany wymuszony marginTop: -30 oraz zIndex, żeby karta fizycznie weszła na nagłówek */}
        <View style={[styles.heroSection]}>
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={() => router.push('/(main)/trips')}
            style={[styles.heroCard, { backgroundColor: currentColors.card, borderColor: currentColors.border, borderWidth: 1 }]}
          >
            <Image source={{ uri: MOCK_TRIP.image }} style={styles.heroImage} />
            <View style={styles.heroOverlay} />
            <View style={styles.daysBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.daysBadgeText}>{MOCK_TRIP.days_left} dni</Text>
            </View>
            <View style={styles.heroBottom}>
              <View style={styles.heroSubtitleRow}>
                <Ionicons name="location" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.heroSubtitle}>Nadchodząca podróż</Text>
              </View>
              <View style={styles.heroMainRow}>
                <View>
                  <Text style={styles.heroDestination}>{MOCK_TRIP.destination}</Text>
                  <Text style={styles.heroDates}>
                    {MOCK_TRIP.start_date} – {MOCK_TRIP.end_date} · {MOCK_TRIP.travelers} os.
                  </Text>
                </View>
                <View style={styles.heroArrow}>
                  <Ionicons name="chevron-forward" size={20} color="white" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* --- SEKCJA BUDŻETU --- */}
        <View style={styles.section}>
          <View style={[styles.card, { backgroundColor: currentColors.card, borderColor: currentColors.border, borderWidth: 1 }]}>
            <View style={styles.cardHeader}>
              <View style={styles.row}>
                <Ionicons name="wallet-outline" size={18} color={Colors.brand.blue} />
                <Text style={[styles.cardTitle, { color: currentColors.text }]}>Budżet podróży</Text>
              </View>
              <Text style={[styles.cardSubValue, { color: currentColors.subtext }]}>{MOCK_TRIP.spent} / {MOCK_TRIP.budget} PLN</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: currentColors.border }]}>
              <LinearGradient 
                colors={[Colors.brand.blue, '#7C3AED']} 
                start={{x:0, y:0}} end={{x:1, y:0}}
                style={[styles.progressBar, { width: `${(MOCK_TRIP.spent / MOCK_TRIP.budget) * 100}%` }]} 
              />
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.statusOk}>✓ W normie</Text>
              <Text style={[styles.remainingText, { color: currentColors.subtext }]}>Zostało: {MOCK_TRIP.budget - MOCK_TRIP.spent} PLN</Text>
            </View>
          </View>
        </View>

        {/* --- SZYBKIE AKCJE --- */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: currentColors.text }]}>Szybkie akcje</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionButton icon="airplane-outline" label="Nowy plan" color={Colors.brand.blue} bg={currentColors.card} border={currentColors.border} textColor={currentColors.text} onPress={() => router.push('/(main)/create')} />
            <QuickActionButton icon="bulb-outline" label="Inspiracje" color="#F59E0B" bg={currentColors.card} border={currentColors.border} textColor={currentColors.text} onPress={() => router.push('/(main)/inspiration')} />
            <QuickActionButton icon="pie-chart-outline" label="Wydatki" color="#10B981" bg={currentColors.card} border={currentColors.border} textColor={currentColors.text} onPress={() => {}} />
            <QuickActionButton icon="share-social-outline" label="Udostępnij" color="#8B5CF6" bg={currentColors.card} border={currentColors.border} textColor={currentColors.text} onPress={() => {}} />
          </View>
        </View>

        {/* --- HARMONOGRAM --- */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeading, { color: currentColors.text }]}>Dzisiaj w planie</Text>
            <TouchableOpacity><Text style={styles.seeAllText}>Cały plan</Text></TouchableOpacity>
          </View>
          <View style={styles.scheduleList}>
            {MOCK_TRIP.schedule.map((act) => (
              <View key={act.id} style={[styles.scheduleItem, { backgroundColor: currentColors.card, borderColor: currentColors.border, borderWidth: 1 }]}>
                <View style={[styles.scheduleIcon, { backgroundColor: currentColors.background }]}>
                  <Ionicons 
                    name={act.type === 'attraction' ? 'camera-outline' : act.type === 'restaurant' ? 'restaurant-outline' : 'bed-outline'} 
                    size={20} 
                    color={Colors.brand.blue} 
                  />
                </View>
                <View style={styles.scheduleInfo}>
                  <Text style={[styles.scheduleName, { color: currentColors.text }]}>{act.name}</Text>
                  <Text style={[styles.scheduleTime, { color: currentColors.subtext }]}>{act.time} · {act.duration} min</Text>
                </View>
                <Text style={[styles.scheduleCost, { color: act.cost > 0 ? '#FF6B35' : currentColors.subtext }]}>
                  {act.cost > 0 ? `${act.cost} PLN` : 'Darmowe'}
                </Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

function QuickActionButton({ icon, label, color, bg, border, textColor, onPress }: any) {
  return (
    <TouchableOpacity style={styles.qaButton} onPress={onPress}>
      <View style={[styles.qaIconBox, { backgroundColor: bg, borderColor: border, borderWidth: 1 }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.qaLabel, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}