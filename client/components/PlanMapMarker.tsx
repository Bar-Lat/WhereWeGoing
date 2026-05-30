import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/styles/colors';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  transport: 'bus-outline',
  jedzenie: 'restaurant-outline',
  food: 'restaurant-outline',
  atrakcja: 'business-outline',
  attraction: 'business-outline',
  nocleg: 'bed-outline',
  accommodation: 'bed-outline',
  inne: 'bookmark-outline',
  other: 'bookmark-outline',
};

type PlanMapMarkerProps = {
  orderNumber: number;
  category: string;
  imageUrl?: string | null;
};

export default function PlanMapMarker({ orderNumber, category, imageUrl }: PlanMapMarkerProps) {
  const iconName = CATEGORY_ICONS[category?.toLowerCase()] ?? 'location-outline';

  return (
    <View style={styles.wrap}>
      <View style={styles.photoCircle}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.photoImage} resizeMode="cover" />
        ) : (
          <View style={styles.iconFallback}>
            <Ionicons name={iconName} size={22} color={Colors.brand.blue} />
          </View>
        )}
      </View>
      <View style={styles.numberBadge}>
        <Text style={styles.numberText}>{orderNumber}</Text>
      </View>
    </View>
  );
}

const MARKER_SIZE = 52;
const BADGE_SIZE = 22;

const styles = StyleSheet.create({
  wrap: {
    width: MARKER_SIZE + 8,
    height: MARKER_SIZE + 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCircle: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    borderWidth: 2.5,
    borderColor: '#ef4444',
    backgroundColor: '#fff',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  iconFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff7f7',
  },
  numberBadge: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    color: '#ea580c',
    fontSize: 11,
    fontWeight: '800',
  },
});
