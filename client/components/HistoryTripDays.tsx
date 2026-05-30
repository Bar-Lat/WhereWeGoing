import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/styles/colors';
import ScheduleDayTimeline, { type TimelineActivityItem } from '@/components/ScheduleDayTimeline';
import type { TripHistoryDay } from '@/services/trip.api';
import { parseActivityCoordinates } from '@/utils/activityMap';

type HistoryColors = {
  background: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
};

type HistoryTripDaysProps = {
  days: TripHistoryDay[];
  destination: string;
  currentColors: HistoryColors;
};

const formatHistoryDateLabel = (date: string | null | undefined) => {
  if (!date) return '';

  const isoDate = date.includes('T') ? date.split('T')[0] : date.slice(0, 10);
  const parts = isoDate.split('-');
  if (parts.length < 3) return date;

  const [year, month, day] = parts;
  const months = [
    '', 'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
  ];
  const monthIndex = parseInt(month, 10);
  return `${parseInt(day, 10)} ${months[monthIndex] ?? ''}${year ? ` ${year}` : ''}`;
};

const formatHistoryActivityTime = (time: string | null | undefined) => {
  if (!time) return '09:00';
  if (time.includes('T')) {
    return time.split('T')[1]?.slice(0, 5) || '09:00';
  }
  return time.slice(0, 5);
};

function HistoryDayCard({
  day,
  dayIndex,
  destination,
  currentColors,
}: {
  day: TripHistoryDay;
  dayIndex: number;
  destination: string;
  currentColors: HistoryColors;
}) {
  const [expanded, setExpanded] = useState(dayIndex === 0);
  const dayNumber = day.dayNumber ?? dayIndex + 1;
  const dateLabel = formatHistoryDateLabel(day.date);
  const headerTitle = day.title?.trim() || dateLabel || `Dzień ${dayNumber}`;

  const textColor = expanded ? '#fff' : currentColors.text;
  const subtextColor = expanded ? 'rgba(255,255,255,0.85)' : currentColors.subtext;
  const iconColor = expanded ? '#fff' : currentColors.subtext;
  const numberBgColor = expanded ? 'rgba(255,255,255,0.25)' : currentColors.background;
  const numberTextColor = expanded ? '#fff' : Colors.brand.blue;

  const timelineItems: TimelineActivityItem[] = day.activities.map((activity, actIndex) => ({
    key: activity.id || `${day.dayId}-${actIndex}`,
    name: activity.name,
    time: formatHistoryActivityTime(activity.time),
    description: activity.description || '',
    category: activity.category || 'inne',
    location: activity.location || '',
    cost: activity.cost ?? 0,
    durationMinutes: activity.duration_minutes,
    coordinates: parseActivityCoordinates(activity.coordinates) ?? undefined,
  }));

  const renderHeaderContent = () => (
    <>
      <View style={[styles.dayNumber, { backgroundColor: numberBgColor }]}>
        <Text style={[styles.dayNumberText, { color: numberTextColor }]}>{dayNumber}</Text>
      </View>

      <View style={styles.dayInfo}>
        <Text
          style={[
            styles.dayDate,
            {
              color: textColor,
              textShadowColor: expanded ? 'rgba(0,0,0,0.15)' : 'transparent',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            },
          ]}
          numberOfLines={1}
        >
          {headerTitle}
        </Text>
        <Text style={[styles.dayMeta, { color: subtextColor }]}>
          {dateLabel && day.title?.trim() ? `${dateLabel} · ` : ''}
          {day.activities.length} punktów w planie
        </Text>
      </View>

      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={iconColor} style={{ marginRight: 4 }} />
    </>
  );

  return (
    <View style={styles.dayWrapper}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setExpanded((current) => !current)}
        style={[styles.dayHeaderWrapper, expanded && styles.gradientShadow]}
      >
        {expanded ? (
          <LinearGradient
            colors={Colors.brand.logoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dayHeaderShared}
          >
            {renderHeaderContent()}
            <LinearGradient colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']} style={styles.gloss} />
          </LinearGradient>
        ) : (
          <View style={[styles.dayHeaderShared, { backgroundColor: currentColors.card }]}>
            {renderHeaderContent()}
          </View>
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.dayContent, { backgroundColor: currentColors.background }]}>
          {timelineItems.length > 0 ? (
            <ScheduleDayTimeline
              destination={destination}
              activities={timelineItems}
              editable={false}
              showTransits={false}
              showMapActions
              mapLinkMode="place"
              currentColors={currentColors}
            />
          ) : (
            <Text style={[styles.emptyDayText, { color: currentColors.subtext }]}>
              Brak punktów w tym dniu.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function HistoryTripDays({ days, destination, currentColors }: HistoryTripDaysProps) {
  if (days.length === 0) {
    return (
      <Text style={[styles.emptyTripText, { color: currentColors.subtext }]}>
        Brak aktywności dla tej wycieczki.
      </Text>
    );
  }

  return (
    <View style={styles.daysList}>
      {days.map((day, index) => (
        <HistoryDayCard
          key={day.dayId}
          day={day}
          dayIndex={index}
          destination={destination}
          currentColors={currentColors}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  daysList: { gap: 12 },
  dayWrapper: { borderRadius: 16, overflow: 'hidden' },
  dayHeaderWrapper: { borderRadius: 16 },
  dayHeaderShared: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 68,
  },
  dayNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    zIndex: 2,
  },
  dayNumberText: { fontSize: 16, fontWeight: '800' },
  dayInfo: { flex: 1, zIndex: 2, paddingRight: 8 },
  dayDate: { fontSize: 16, fontWeight: '800' },
  dayMeta: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  dayContent: { paddingHorizontal: 12, paddingBottom: 16, paddingTop: 4 },
  gloss: { position: 'absolute', top: 0, left: 0, right: 0, height: '45%' },
  gradientShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  emptyDayText: { fontSize: 14, paddingVertical: 8 },
  emptyTripText: { fontSize: 14, lineHeight: 20 },
});
