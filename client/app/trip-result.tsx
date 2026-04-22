// app/trip-result.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Modal,
  TextInput,
  Alert,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/styles/colors';
import { useTripStore, TripPlan, DayPlan } from '@/stores/tripStore';

// ─── TYPY ────────────────────────────────────────────────────────────────────

interface Activity {
  time: string;
  name: string;
  description: string;
  category: string;
  estimatedCost: number;
  location: string;
}

// ─── HELPERY ─────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  transport: '🚌',
  jedzenie: '🍽️',
  atrakcja: '🏛️',
  nocleg: '🏨',
  inne: '📌',
  // angielskie fallbacki
  food: '🍽️',
  attraction: '🏛️',
  accommodation: '🏨',
  other: '📌',
};

function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category?.toLowerCase()] ?? '📍';
}

function getDayOfWeek(dateStr: string): string {
  // obsługuje format dd.mm.rrrr
  const parts = dateStr?.split('.');
  if (!parts || parts.length < 3) return '';
  const [day, month, year] = parts;
  const date = new Date(`${year}-${month}-${day}`);
  const days = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  return days[date.getDay()] ?? '';
}

function formatDate(dateStr: string): string {
  const parts = dateStr?.split('.');
  if (!parts || parts.length < 3) return dateStr ?? '';
  const [day, month] = parts;
  const months = [
    '', 'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
  ];
  return `${parseInt(day)} ${months[parseInt(month)] ?? ''}`;
}

// ─── KOMPONENT AKTYWNOŚCI ─────────────────────────────────────────────────────

function ActivityCard({
  activity,
  isLast,
  onDelete,
  onEdit,
  currentColors,
}: {
  activity: Activity;
  isLast: boolean;
  onDelete: () => void;
  onEdit: (updated: Activity) => void;
  currentColors: any;
}) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editData, setEditData] = useState<Activity>({ ...activity });

  const handleSaveEdit = () => {
    onEdit(editData);
    setEditVisible(false);
  };

  return (
    <>
      {/* Linia osi czasu */}
      <View style={styles.timelineRow}>
        <View style={styles.timelineLeft}>
          <View style={[styles.timelineDot, { backgroundColor: getCategoryColor(activity.category) }]} />
          {!isLast && <View style={[styles.timelineLine, { backgroundColor: currentColors.border }]} />}
        </View>

        {/* Karta */}
        <View style={[styles.activityCard, { backgroundColor: currentColors.card }]}>
          <View style={styles.activityHeader}>
            <View style={[styles.activityIconBox, { backgroundColor: currentColors.background }]}>
              <Text style={styles.activityIcon}>{getCategoryIcon(activity.category)}</Text>
            </View>

            <View style={styles.activityInfo}>
              <Text style={[styles.activityName, { color: currentColors.text }]} numberOfLines={2}>
                {activity.name}
              </Text>
              <View style={styles.activityMeta}>
                <Text style={[styles.activityMetaText, { color: currentColors.subtext }]}>
                  🕐 {activity.time}
                </Text>
                {activity.estimatedCost > 0 && (
                  <Text style={styles.activityCost}>
                    {activity.estimatedCost} PLN
                  </Text>
                )}
              </View>
              <Text style={[styles.activityDesc, { color: currentColors.subtext }]} numberOfLines={2}>
                {activity.description}
              </Text>
            </View>

            {/* Przyciski akcji */}
            <View style={styles.activityActions}>
              {/* Google Maps — placeholder */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: currentColors.background }]}
                onPress={() => {/* TODO: otwórz Google Maps */}}
              >
                <Text style={styles.actionBtnIcon}>🗺️</Text>
              </TouchableOpacity>
              {/* Edycja / menu */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: currentColors.background }]}
                onPress={() => setMenuVisible(true)}
              >
                <Text style={styles.actionBtnIcon}>✏️</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Transport tag */}
          {activity.location ? (
            <View style={styles.locationTag}>
              <Text style={[styles.locationTagText, { color: currentColors.subtext }]}>
                📍 {activity.location}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Menu akcji (modal) */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={[styles.menuSheet, { backgroundColor: currentColors.card }]}>
            <Text style={[styles.menuTitle, { color: currentColors.text }]}>{activity.name}</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setEditData({ ...activity });
                setEditVisible(true);
              }}
            >
              <Text style={styles.menuItemIcon}>✏️</Text>
              <Text style={[styles.menuItemText, { color: currentColors.text }]}>Edytuj</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                Alert.alert(
                  'Usuń aktywność',
                  `Czy na pewno chcesz usunąć "${activity.name}"?`,
                  [
                    { text: 'Anuluj', style: 'cancel' },
                    { text: 'Usuń', style: 'destructive', onPress: onDelete },
                  ]
                );
              }}
            >
              <Text style={styles.menuItemIcon}>🗑️</Text>
              <Text style={[styles.menuItemTextDanger]}>Usuń</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal edycji */}
      <Modal visible={editVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.editSheet, { backgroundColor: currentColors.card }]}>
            <Text style={[styles.editTitle, { color: currentColors.text }]}>Edytuj aktywność</Text>

            <Text style={[styles.editLabel, { color: currentColors.subtext }]}>Nazwa</Text>
            <TextInput
              style={[styles.editInput, { color: currentColors.text, borderColor: currentColors.border }]}
              value={editData.name}
              onChangeText={(t) => setEditData({ ...editData, name: t })}
            />

            <Text style={[styles.editLabel, { color: currentColors.subtext }]}>Godzina</Text>
            <TextInput
              style={[styles.editInput, { color: currentColors.text, borderColor: currentColors.border }]}
              value={editData.time}
              onChangeText={(t) => setEditData({ ...editData, time: t })}
              keyboardType="numeric"
            />

            <Text style={[styles.editLabel, { color: currentColors.subtext }]}>Szacowany koszt (PLN)</Text>
            <TextInput
              style={[styles.editInput, { color: currentColors.text, borderColor: currentColors.border }]}
              value={String(editData.estimatedCost)}
              onChangeText={(t) => setEditData({ ...editData, estimatedCost: parseInt(t) || 0 })}
              keyboardType="numeric"
            />

            <Text style={[styles.editLabel, { color: currentColors.subtext }]}>Opis</Text>
            <TextInput
              style={[styles.editInput, styles.editInputMulti, { color: currentColors.text, borderColor: currentColors.border }]}
              value={editData.description}
              onChangeText={(t) => setEditData({ ...editData, description: t })}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.editLabel, { color: currentColors.subtext }]}>Lokalizacja</Text>
            <TextInput
              style={[styles.editInput, { color: currentColors.text, borderColor: currentColors.border }]}
              value={editData.location}
              onChangeText={(t) => setEditData({ ...editData, location: t })}
            />

            <View style={styles.editButtons}>
              <TouchableOpacity
                style={[styles.editBtnCancel, { borderColor: currentColors.border }]}
                onPress={() => setEditVisible(false)}
              >
                <Text style={[styles.editBtnCancelText, { color: currentColors.text }]}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editBtnSave} onPress={handleSaveEdit}>
                <Text style={styles.editBtnSaveText}>Zapisz</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    transport: '#f59e0b',
    jedzenie: '#10b981',
    atrakcja: '#6366f1',
    nocleg: '#3b82f6',
    inne: '#8b5cf6',
    food: '#10b981',
    attraction: '#6366f1',
    accommodation: '#3b82f6',
    other: '#8b5cf6',
  };
  return map[category?.toLowerCase()] ?? '#6366f1';
}

// ─── KOMPONENT DNIA ───────────────────────────────────────────────────────────

function DayCard({
  day,
  index,
  isLastDay,
  currentColors,
  onUpdateDay,
}: {
  day: DayPlan;
  index: number;
  isLastDay: boolean;
  currentColors: any;
  onUpdateDay: (updated: DayPlan) => void;
}) {
  const [expanded, setExpanded] = useState(index === 0);

  const handleDeleteActivity = (actIndex: number) => {
    const updated = {
      ...day,
      activities: day.activities.filter((_, i) => i !== actIndex),
    };
    onUpdateDay(updated);
  };

  const handleEditActivity = (actIndex: number, updated: Activity) => {
    const newActivities = [...day.activities];
    newActivities[actIndex] = updated;
    onUpdateDay({ ...day, activities: newActivities });
  };

  const handleAddActivity = () => {
    const newActivity: Activity = {
      time: '12:00',
      name: 'Nowa aktywność',
      description: 'Opis aktywności',
      category: 'inne',
      estimatedCost: 0,
      location: '',
    };
    onUpdateDay({ ...day, activities: [...day.activities, newActivity] });
  };

  const isActive = expanded;

  return (
    <View style={styles.dayWrapper}>
      {/* Nagłówek dnia */}
      <TouchableOpacity
        style={[
          styles.dayHeader,
          {
            backgroundColor: isActive ? '#6366f1' : currentColors.card,
          },
        ]}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.85}
      >
        <View style={[styles.dayNumber, { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : currentColors.background }]}>
          <Text style={[styles.dayNumberText, { color: isActive ? '#fff' : '#6366f1' }]}>
            {day.day}
          </Text>
        </View>

        <View style={styles.dayInfo}>
          <Text style={[styles.dayDate, { color: isActive ? '#fff' : currentColors.text }]}>
            {formatDate(day.date)}
          </Text>
          <Text style={[styles.dayWeekday, { color: isActive ? 'rgba(255,255,255,0.75)' : currentColors.subtext }]}>
            {getDayOfWeek(day.date)} · {day.activities.length} punktów
          </Text>
        </View>

        <Text style={[styles.dayChevron, { color: isActive ? '#fff' : currentColors.subtext }]}>
          {expanded ? '∧' : '∨'}
        </Text>
      </TouchableOpacity>

      {/* Rozwinięte aktywności */}
      {expanded && (
        <View style={[styles.dayContent, { backgroundColor: currentColors.background }]}>
          {day.activities.map((activity, actIndex) => (
            <ActivityCard
              key={actIndex}
              activity={activity}
              isLast={actIndex === day.activities.length - 1}
              onDelete={() => handleDeleteActivity(actIndex)}
              onEdit={(updated) => handleEditActivity(actIndex, updated)}
              currentColors={currentColors}
            />
          ))}

          {/* Przycisk dodaj punkt */}
          <TouchableOpacity
            style={[styles.addActivityBtn, { borderColor: currentColors.border }]}
            onPress={handleAddActivity}
          >
            <Text style={styles.addActivityBtnIcon}>+</Text>
            <Text style={[styles.addActivityBtnText, { color: currentColors.subtext }]}>
              Dodaj punkt do planu
            </Text>
          </TouchableOpacity>

          {/* Wskazówka dnia */}
          {day.tips ? (
            <View style={[styles.tipBox, { backgroundColor: '#fef3c720', borderColor: '#fbbf2440' }]}>
              <Text style={styles.tipIcon}>💡</Text>
              <Text style={[styles.tipText, { color: currentColors.subtext }]}>{day.tips}</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

// ─── GŁÓWNY EKRAN ─────────────────────────────────────────────────────────────

export default function TripResult() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];

  const { tripPlan, formData, setTripPlan } = useTripStore();
  const [activeTab, setActiveTab] = useState<'schedule' | 'map' | 'budget' | 'share'>('schedule');
  const [localPlan, setLocalPlan] = useState<TripPlan | null>(tripPlan);

  if (!localPlan) {
    return (
      <View style={[styles.container, { backgroundColor: currentColors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.emptyText, { color: currentColors.subtext }]}>Brak danych planu</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Wróć</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleUpdateDay = (dayIndex: number, updated: DayPlan) => {
    const newDays = [...localPlan.days];
    newDays[dayIndex] = updated;
    const newPlan = { ...localPlan, days: newDays };
    setLocalPlan(newPlan);
    setTripPlan(newPlan);
  };

  const TABS = [
    { id: 'schedule', label: 'Harmonogram' },
    { id: 'map', label: 'Mapa' },
    { id: 'budget', label: 'Budżet' },
    { id: 'share', label: 'Udostępnij' },
  ] as const;

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      {/* ── HERO HEADER ── */}
      <View style={styles.heroContainer}>
        {/* Gradient tło zamiast zdjęcia — łatwo podmienić na ImageBackground z Unsplash */}
        <View style={styles.heroGradient}>
          <View style={styles.heroOverlay} />

          {/* Przyciski nawigacji */}
          <View style={[styles.heroNav, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity style={styles.heroNavBtn} onPress={() => router.back()}>
              <Text style={styles.heroNavIcon}>←</Text>
            </TouchableOpacity>
            <View style={styles.heroNavRight}>
              <TouchableOpacity style={styles.heroNavBtn}>
                <Text style={styles.heroNavIcon}>⬇</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.heroNavBtn, { marginLeft: 8 }]}>
                <Text style={styles.heroNavIcon}>↗</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Info o wycieczce */}
          <View style={styles.heroInfo}>
            <View style={styles.heroTitleRow}>
              <Text style={styles.heroCity}>{localPlan.destination}</Text>
              <View style={styles.heroCountryBadge}>
                <Text style={styles.heroCountryText}>
                  {formData?.destination ?? localPlan.destination}
                </Text>
              </View>
            </View>

            <View style={styles.heroBadges}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeIcon}>🕐</Text>
                <Text style={styles.heroBadgeText}>{localPlan.totalDays} dni</Text>
              </View>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeIcon}>👥</Text>
                <Text style={styles.heroBadgeText}>{formData?.travelers ?? 1} {(formData?.travelers ?? 1) === 1 ? 'osoba' : 'osoby'}</Text>
              </View>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeIcon}>💰</Text>
                <Text style={styles.heroBadgeText}>{(formData?.budget ?? localPlan.estimatedTotalCost).toLocaleString()} PLN</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ── ZAKŁADKI ── */}
      <View style={[styles.tabBar, { backgroundColor: currentColors.card, borderBottomColor: currentColors.border }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.id ? '#6366f1' : currentColors.subtext },
            ]}>
              {tab.label}
            </Text>
            {activeTab === tab.id && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── ZAWARTOŚĆ ZAKŁADEK ── */}
      {activeTab === 'schedule' && (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Podsumowanie wycieczki */}
          <View style={[styles.summaryBox, { backgroundColor: currentColors.card }]}>
            <Text style={[styles.summaryText, { color: currentColors.subtext }]}>
              {localPlan.summary}
            </Text>
            {localPlan.bestTransport ? (
              <View style={styles.transportTag}>
                <Text style={styles.transportTagIcon}>🚌</Text>
                <Text style={[styles.transportTagText, { color: currentColors.subtext }]}>
                  {localPlan.bestTransport}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Lista dni */}
          {localPlan.days.map((day, index) => (
            <DayCard
              key={day.day}
              day={day}
              index={index}
              isLastDay={index === localPlan.days.length - 1}
              currentColors={currentColors}
              onUpdateDay={(updated) => handleUpdateDay(index, updated)}
            />
          ))}

          {/* Ogólne wskazówki */}
          {localPlan.generalTips?.length > 0 && (
            <View style={[styles.tipsSection, { backgroundColor: currentColors.card }]}>
              <Text style={[styles.tipsSectionTitle, { color: currentColors.text }]}>
                💡 Wskazówki ogólne
              </Text>
              {localPlan.generalTips.map((tip, i) => (
                <View key={i} style={styles.generalTipRow}>
                  <View style={[styles.generalTipDot, { backgroundColor: '#6366f1' }]} />
                  <Text style={[styles.generalTipText, { color: currentColors.subtext }]}>{tip}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Pozostałe zakładki — placeholder */}
      {activeTab !== 'schedule' && (
        <View style={styles.tabPlaceholder}>
          <Text style={styles.tabPlaceholderIcon}>
            {activeTab === 'map' ? '🗺️' : activeTab === 'budget' ? '💰' : '↗️'}
          </Text>
          <Text style={[styles.tabPlaceholderText, { color: currentColors.subtext }]}>
            Sekcja {TABS.find(t => t.id === activeTab)?.label} — wkrótce
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── STYLE ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Hero
  heroContainer: { height: 200 },
  heroGradient: {
    flex: 1,
    backgroundColor: '#1e1b4b',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(99,102,241,0.55)',
  },
  heroNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  heroNavRight: { flexDirection: 'row' },
  heroNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroNavIcon: { color: '#fff', fontSize: 16, fontWeight: '600' },
  heroInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  heroCity: { fontSize: 28, fontWeight: '800', color: '#fff', marginRight: 10 },
  heroCountryBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  heroCountryText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  heroBadges: { flexDirection: 'row', gap: 10 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroBadgeIcon: { fontSize: 12, marginRight: 4 },
  heroBadgeText: { color: '#fff', fontSize: 13, fontWeight: '500' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabText: { fontSize: 13, fontWeight: '600' },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '10%',
    right: '10%',
    height: 2,
    backgroundColor: '#6366f1',
    borderRadius: 1,
  },

  // Scroll
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // Summary box
  summaryBox: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  summaryText: { fontSize: 14, lineHeight: 21 },
  transportTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  transportTagIcon: { fontSize: 14, marginRight: 6 },
  transportTagText: { fontSize: 13, fontWeight: '500' },

  // Day wrapper
  dayWrapper: { marginBottom: 10, borderRadius: 14, overflow: 'hidden' },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
  },
  dayNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dayNumberText: { fontSize: 16, fontWeight: '800' },
  dayInfo: { flex: 1 },
  dayDate: { fontSize: 16, fontWeight: '700' },
  dayWeekday: { fontSize: 13, marginTop: 1 },
  dayChevron: { fontSize: 18, fontWeight: '600', paddingLeft: 8 },
  dayContent: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4 },

  // Timeline
  timelineRow: { flexDirection: 'row', marginTop: 10 },
  timelineLeft: { width: 24, alignItems: 'center', marginRight: 10 },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 14,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    marginTop: 4,
  },

  // Activity card
  activityCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 2,
  },
  activityHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  activityIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  activityIcon: { fontSize: 20 },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  activityMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 8 },
  activityMetaText: { fontSize: 12 },
  activityCost: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366f1',
  },
  activityDesc: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  activityActions: { flexDirection: 'column', gap: 6, marginLeft: 8 },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnIcon: { fontSize: 14 },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  locationTagText: { fontSize: 12 },

  // Add activity button
  addActivityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 10,
  },
  addActivityBtnIcon: {
    fontSize: 18,
    color: '#6366f1',
    marginRight: 6,
    fontWeight: '600',
  },
  addActivityBtnText: { fontSize: 14, fontWeight: '500' },

  // Tip box
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  tipIcon: { fontSize: 16, marginRight: 8, marginTop: 1 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // General tips
  tipsSection: {
    borderRadius: 14,
    padding: 16,
    marginTop: 6,
  },
  tipsSectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  generalTipRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  generalTipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    marginRight: 10,
  },
  generalTipText: { flex: 1, fontSize: 14, lineHeight: 20 },

  // Menu modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  menuTitle: { fontSize: 16, fontWeight: '700', marginBottom: 20 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  menuItemIcon: { fontSize: 20, marginRight: 14 },
  menuItemText: { fontSize: 16 },
  menuItemTextDanger: { fontSize: 16, color: '#ef4444' },

  // Edit modal
  editSheet: {
    margin: 16,
    borderRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  editTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  editLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 12 },
  editInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  editInputMulti: { height: 80, textAlignVertical: 'top' },
  editButtons: { flexDirection: 'row', gap: 10, marginTop: 20 },
  editBtnCancel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  editBtnCancelText: { fontSize: 15, fontWeight: '600' },
  editBtnSave: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  editBtnSaveText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Tab placeholder
  tabPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabPlaceholderIcon: { fontSize: 48, marginBottom: 12 },
  tabPlaceholderText: { fontSize: 16 },

  // Fallback
  emptyText: { fontSize: 16, marginBottom: 16 },
  backLink: { color: '#6366f1', fontSize: 15 },
});
