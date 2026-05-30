import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/styles/colors';
import type { DayPlan } from '@/stores/tripStore';
import PlanMapMarker from '@/components/PlanMapMarker';
import {
  buildGoogleMapsDirectionsUrl,
  getMapRegionForPoints,
  resolveMapActivityPoints,
  type MapActivityPoint,
} from '@/utils/activityMap';

type TripMapTabProps = {
  days: DayPlan[];
  destination: string;
  currentColors: {
    background: string;
    card: string;
    text: string;
    subtext: string;
    border: string;
  };
};

const formatDayDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('.');
  if (parts.length < 2) return dateStr;
  const months = [
    '', 'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
  ];
  return `${parseInt(parts[0], 10)} ${months[parseInt(parts[1], 10)] ?? ''}`;
};

function DayMapPanel({
  day,
  dayIndex,
  destination,
  expanded,
  onToggle,
  currentColors,
}: {
  day: DayPlan;
  dayIndex: number;
  destination: string;
  expanded: boolean;
  onToggle: () => void;
  currentColors: TripMapTabProps['currentColors'];
}) {
  const mapRef = useRef<MapView | null>(null);
  const [points, setPoints] = useState<MapActivityPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!expanded) return;

    let cancelled = false;
    const loadPoints = async () => {
      setLoading(true);
      const resolved = await resolveMapActivityPoints(
        day.activities.map((activity, actIndex) => ({
          key: activity.id ?? `${dayIndex}-${actIndex}`,
          name: activity.name,
          category: activity.category,
          location: activity.location,
          imageUrl: activity.imageUrl,
          coordinates: activity.coordinates,
        })),
        destination
      );

      if (!cancelled) {
        setPoints(resolved);
        setLoading(false);
      }
    };

    void loadPoints();
    return () => {
      cancelled = true;
    };
  }, [day.activities, dayIndex, destination, expanded]);

  const region = useMemo(() => getMapRegionForPoints(points.map((point) => point.coordinates)), [points]);

  useEffect(() => {
    if (!expanded || points.length === 0) return;
    mapRef.current?.animateToRegion(region, 350);
  }, [expanded, points, region]);

  const googleMapsUrl = useMemo(
    () => buildGoogleMapsDirectionsUrl(points.map((point) => point.coordinates)),
    [points]
  );

  const textColor = expanded ? '#fff' : currentColors.text;
  const subtextColor = expanded ? 'rgba(255,255,255,0.85)' : currentColors.subtext;

  return (
    <View style={[styles.dayCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
      <TouchableOpacity activeOpacity={0.9} onPress={onToggle}>
        {expanded ? (
          <LinearGradient colors={[Colors.brand.blue, '#4f46e5']} style={styles.dayHeader}>
            <View style={[styles.dayNumber, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <Text style={[styles.dayNumberText, { color: '#fff' }]}>{day.day}</Text>
            </View>
            <View style={styles.dayInfo}>
              <Text style={[styles.dayTitle, { color: textColor }]} numberOfLines={1}>
                {day.title || `Dzień ${day.day}`}
              </Text>
              <Text style={[styles.dayMeta, { color: subtextColor }]}>
                {formatDayDate(day.date)} · {day.activities.length} punktów
              </Text>
            </View>
            <Ionicons name="chevron-up" size={18} color="#fff" />
          </LinearGradient>
        ) : (
          <View style={[styles.dayHeader, { backgroundColor: currentColors.card }]}>
            <View style={[styles.dayNumber, { backgroundColor: currentColors.background }]}>
              <Text style={[styles.dayNumberText, { color: Colors.brand.blue }]}>{day.day}</Text>
            </View>
            <View style={styles.dayInfo}>
              <Text style={[styles.dayTitle, { color: textColor }]} numberOfLines={1}>
                {day.title || `Dzień ${day.day}`}
              </Text>
              <Text style={[styles.dayMeta, { color: subtextColor }]}>
                {formatDayDate(day.date)} · {day.activities.length} punktów
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={currentColors.subtext} />
          </View>
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.mapSection, { backgroundColor: currentColors.background }]}>
          {loading ? (
            <View style={styles.mapPlaceholder}>
              <ActivityIndicator color={Colors.brand.blue} />
              <Text style={[styles.placeholderText, { color: currentColors.subtext }]}>Ładowanie mapy...</Text>
            </View>
          ) : points.length === 0 ? (
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map-outline" size={28} color={currentColors.subtext} />
              <Text style={[styles.placeholderText, { color: currentColors.subtext }]}>
                Brak współrzędnych dla atrakcji tego dnia.
              </Text>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              initialRegion={region}
              scrollEnabled
              zoomEnabled
              rotateEnabled={false}
              pitchEnabled={false}
            >
              {points.map((point) => (
                <Marker
                  key={point.key}
                  coordinate={point.coordinates}
                  title={point.name}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={false}
                >
                  <PlanMapMarker
                    orderNumber={point.orderNumber}
                    category={point.category}
                    imageUrl={point.imageUrl}
                  />
                </Marker>
              ))}
            </MapView>
          )}

          <TouchableOpacity
            style={[
              styles.googleBtn,
              { opacity: googleMapsUrl ? 1 : 0.45 },
            ]}
            disabled={!googleMapsUrl}
            onPress={() => {
              if (googleMapsUrl) {
                void Linking.openURL(googleMapsUrl);
              }
            }}
          >
            <Ionicons name="navigate-outline" size={16} color="#fff" />
            <Text style={styles.googleBtnText}>Pokaż na mapach google</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function TripMapTab({ days, destination, currentColors }: TripMapTabProps) {
  const [expandedDay, setExpandedDay] = useState<number | null>(days[0]?.day ?? null);

  if (!days.length) {
    return (
      <Text style={[styles.emptyText, { color: currentColors.subtext }]}>
        Brak dni w planie — dodaj harmonogram, aby zobaczyć mapę.
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      {days.map((day, index) => (
        <DayMapPanel
          key={`map-day-${day.day}-${index}`}
          day={day}
          dayIndex={index}
          destination={destination}
          expanded={expandedDay === day.day}
          onToggle={() => setExpandedDay((current) => (current === day.day ? null : day.day))}
          currentColors={currentColors}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  dayCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  dayNumber: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberText: {
    fontSize: 16,
    fontWeight: '800',
  },
  dayInfo: {
    flex: 1,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  dayMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  mapSection: {
    padding: 12,
    gap: 10,
  },
  map: {
    width: '100%',
    height: 260,
    borderRadius: 14,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    width: '100%',
    height: 260,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
  },
  placeholderText: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.brand.blue,
    borderRadius: 12,
    paddingVertical: 12,
  },
  googleBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    paddingVertical: 12,
  },
});
