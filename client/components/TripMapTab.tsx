import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/styles/colors';
import type { DayPlan } from '@/stores/tripStore';
import LeafletTripMap from '@/components/LeafletTripMap';
import { resolveMapActivityPoints, type MapActivityPoint } from '@/utils/activityMap';

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
  const [points, setPoints] = useState<MapActivityPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!expanded) return;

    let cancelled = false;
    const loadPoints = async () => {
      setLoading(true);
      setSelectedIndex(0);
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

  const focusPoint = (index: number) => {
    if (points.length === 0) return;
    setSelectedIndex(index);
  };

  const goToPreviousPoint = () => {
    if (points.length === 0) return;
    focusPoint((selectedIndex - 1 + points.length) % points.length);
  };

  const goToNextPoint = () => {
    if (points.length === 0) return;
    focusPoint((selectedIndex + 1) % points.length);
  };

  const textColor = expanded ? '#fff' : currentColors.text;
  const subtextColor = expanded ? 'rgba(255,255,255,0.85)' : currentColors.subtext;
  const selectedPoint = points[selectedIndex];

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
              <Text style={[styles.placeholderText, { color: currentColors.subtext }]}>
                Wyszukiwanie punktów na mapie...
              </Text>
            </View>
          ) : points.length === 0 ? (
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map-outline" size={28} color={currentColors.subtext} />
              <Text style={[styles.placeholderText, { color: currentColors.subtext }]}>
                Brak lokalizacji do wyświetlenia dla atrakcji tego dnia.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.mapContainer}>
                <LeafletTripMap
                  points={points}
                  selectedIndex={selectedIndex}
                  onMarkerPress={focusPoint}
                />
              </View>

              <View style={styles.pointNavigator}>
                <TouchableOpacity
                  style={[styles.navArrowBtn, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}
                  onPress={goToPreviousPoint}
                  accessibilityLabel="Poprzedni punkt"
                >
                  <Ionicons name="chevron-back" size={18} color={Colors.brand.blue} />
                </TouchableOpacity>

                <View style={styles.pointCounterBox}>
                  <Text style={[styles.pointCounter, { color: currentColors.text }]}>
                    {selectedIndex + 1}/{points.length}
                  </Text>
                  {selectedPoint && (
                    <Text style={[styles.pointName, { color: currentColors.subtext }]} numberOfLines={1}>
                      {selectedPoint.name}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.navArrowBtn, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}
                  onPress={goToNextPoint}
                  accessibilityLabel="Następny punkt"
                >
                  <Ionicons name="chevron-forward" size={18} color={Colors.brand.blue} />
                </TouchableOpacity>
              </View>
            </>
          )}
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
  },
  mapContainer: {
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
  pointNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10,
  },
  navArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointCounterBox: {
    minWidth: 120,
    alignItems: 'center',
    gap: 2,
  },
  pointCounter: {
    fontSize: 16,
    fontWeight: '800',
  },
  pointName: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 180,
  },
  emptyText: {
    fontSize: 14,
    paddingVertical: 12,
  },
});
