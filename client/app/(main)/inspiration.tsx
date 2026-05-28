import React from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, 
  Image, useColorScheme
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/styles/colors';
import { styles } from '@/styles/inspiration.styles';
import ScreenHeader from '../../components/ScreenHeader';
import { useCurrentUserProfile } from '@/hooks/useCurrentUserProfile';
import { useNotifications } from '@/providers/notifications.provider';

// --- MOCK DATA ---
const CATEGORIES = [
  { id: '1', name: 'Góry', icon: 'image' }, 
  { id: '2', name: 'Morze', icon: 'water-outline' },
  { id: '3', name: 'City Break', icon: 'business-outline' },
  { id: '4', name: 'Natura', icon: 'leaf-outline' },
];

const FEATURED_TRIP = {
  destination: "Rzym, Włochy",
  subtitle: "Odkryj wieczne miasto na weekend",
  price: "od 450 PLN",
  image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1000&auto=format&fit=crop"
};

const DESTINATIONS = [
  { id: '1', name: 'Barcelona', country: 'Hiszpania', image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=500&auto=format&fit=crop' },
  { id: '2', name: 'Bali', country: 'Indonezja', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=500&auto=format&fit=crop' },
  { id: '3', name: 'Tromsø', country: 'Norwegia', image: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?q=80&w=500&auto=format&fit=crop' },
  { id: '4', name: 'Lizbona', country: 'Portugalia', image: 'https://images.unsplash.com/photo-1585210204758-c917ee6a7f47?q=80&w=500&auto=format&fit=crop' },
];

export default function Inspiration() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const { userAvatarUrl, userInitials } = useCurrentUserProfile();
  
  const bottomPadding = 65 + (insets.bottom > 0 ? insets.bottom : 10) + 20;

  const { hasUnreadNotifications } = useNotifications();

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      


      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        <ScreenHeader 
          variant="inspiration"
          userInitials={userInitials}
          onNotificationPress={() => router.push('/notifications')}
          onProfilePress={() => router.push('/(main)/profile')}
          userAvatarUrl={userAvatarUrl}
          hasUnreadNotifications={hasUnreadNotifications}
        />
        
        <View style={styles.heroSection}>
          <TouchableOpacity activeOpacity={0.9} style={[styles.featuredCard, {borderWidth: 1, borderColor: currentColors.border, backgroundColor: currentColors.card}]}>
            <Image source={{ uri: FEATURED_TRIP.image }} style={styles.featuredImage} />
            <LinearGradient 
              colors={['transparent', 'rgba(0,0,0,0.8)']} 
              style={styles.featuredOverlay} 
            />
            
            <View style={styles.featuredTopBadge}>
              <Text style={styles.featuredBadgeText}>HIT MIESIĄCA</Text>
            </View>

            <View style={styles.featuredBottom}>
              <Text style={styles.featuredTitle}>{FEATURED_TRIP.destination}</Text>
              <Text style={styles.featuredSubtitle}>{FEATURED_TRIP.subtitle}</Text>
              <View style={styles.priceTag}>
                <Text style={styles.priceText}>{FEATURED_TRIP.price}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* --- KATEGORIE --- */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: currentColors.text }]}>Wybierz klimat</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity 
                key={cat.id} 
                style={[styles.categoryBtn, { backgroundColor: currentColors.card, borderColor: currentColors.border, borderWidth: 1 }]}
              >
                <View style={[styles.categoryIconBox, { backgroundColor: Colors.brand.blue + '15' }]}>
                  <Ionicons name={cat.icon as any} size={20} color={Colors.brand.blue} />
                </View>
                <Text style={[styles.categoryText, { color: currentColors.text }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* --- POPULARNE --- */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeading, { color: currentColors.text }]}>Najpopularniejsze</Text>
            <TouchableOpacity><Text style={styles.seeAllText}>Wszystkie</Text></TouchableOpacity>
          </View>
          
          <View style={styles.gridContainer}>
            {DESTINATIONS.map((dest) => (
              <TouchableOpacity key={dest.id} style={styles.gridItem}>
                <Image source={{ uri: dest.image }} style={styles.gridImage} />
                <LinearGradient 
                  colors={['transparent', 'rgba(0,0,0,0.7)']} 
                  style={styles.gridOverlay} 
                />
                <View style={styles.gridInfo}>
                  <Text style={styles.gridDestName}>{dest.name}</Text>
                  <View style={styles.gridCountryRow}>
                    <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.gridCountry}>{dest.country}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}