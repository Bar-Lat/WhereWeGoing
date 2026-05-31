import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import type { TripScheduleActivityDto, TripScheduleDayDto } from '@/types/trips';
import TimePickerSheet from '@/components/TimePickerSheet';
import ActivityCostBadge from '@/components/ActivityCostBadge';
import {
  computeEndTime,
  durationFromTimes,
  formatActivityTimeRange,
  activityRangeOverlapsSchedule,
  buildDayScheduleContext,
  toActivityTimeRange,
  formatEndTimeLabel,
  isValidActivityTimeRange,
  type ActivityTimeRangeInput,
  type DayActivityScheduleContext,
} from '@/utils/activityTime';

type ScheduleColors = {
  background: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
};

type ActivityInput = {
  name: string;
  time: string;
  endTime: string;
  description: string;
  category: string;
  location: string;
  cost: number;
  durationMinutes: number;
};

type TripScheduleSectionProps = {
  days: TripScheduleDayDto[];
  loading: boolean;
  editable: boolean;
  saving: boolean;
  currentColors: ScheduleColors;
  onAddActivity: (dayId: string) => Promise<void>;
  onUpdateActivity: (activityId: string, payload: ActivityInput) => Promise<void>;
  onDeleteActivity: (activityId: string) => Promise<void>;
};

const CATEGORY_ICONS: Record<string, string> = {
  transport: '🚌',
  jedzenie: '🍽️',
  atrakcja: '🏛️',
  nocleg: '🏨',
  inne: '📌',
  food: '🍽️',
  attraction: '🏛️',
  accommodation: '🏨',
  other: '📌',
};

const getCategoryIcon = (category: string) => CATEGORY_ICONS[category?.toLowerCase()] ?? '📍';

const getCategoryColor = (category: string) => {
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
};

const formatDisplayDate = (dateStr: string) => {
  const date = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;

  const months = [
    '', 'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
  ];

  return `${date.getDate()} ${months[date.getMonth() + 1] ?? ''}`;
};

const getDayOfWeek = (dateStr: string) => {
  const date = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const days = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  return days[date.getDay()] ?? '';
};

const toActivityInput = (activity: TripScheduleActivityDto): ActivityInput => ({
  name: activity.name,
  time: activity.time,
  endTime: computeEndTime(activity.time, activity.durationMinutes),
  description: activity.description,
  category: activity.category,
  location: activity.location,
  cost: activity.cost,
  durationMinutes: activity.durationMinutes ?? 60,
});

function ScheduleActivityCard({
  activity,
  otherActivities,
  nextDayActivities,
  previousDayActivities,
  isLast,
  editable,
  saving,
  currentColors,
  onUpdate,
  onDelete,
}: {
  activity: TripScheduleActivityDto;
  otherActivities: TripScheduleActivityDto[];
  nextDayActivities: TripScheduleActivityDto[];
  previousDayActivities: TripScheduleActivityDto[];
  isLast: boolean;
  editable: boolean;
  saving: boolean;
  currentColors: ScheduleColors;
  onUpdate: (payload: ActivityInput) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [timeRangeError, setTimeRangeError] = useState(false);
  const [editData, setEditData] = useState<ActivityInput>(toActivityInput(activity));

  const scheduleContext: DayActivityScheduleContext = buildDayScheduleContext(
    otherActivities.map(toActivityTimeRange),
    nextDayActivities.map(toActivityTimeRange),
    previousDayActivities.map(toActivityTimeRange)
  );

  const validateTimeRange = (startTime: string, endTime: string) => {
    if (!isValidActivityTimeRange(startTime, endTime)) return false;
    return !activityRangeOverlapsSchedule({ startTime, endTime }, scheduleContext);
  };

  const timeRangeErrorMessage =
    'Wybrany przedział godzin koliduje z inną atrakcją tego lub następnego dnia. Popraw początek i koniec.';

  const handleSaveEdit = async () => {
    const durationMinutes = durationFromTimes(editData.time, editData.endTime);
    if (durationMinutes === null || durationMinutes <= 0) {
      Alert.alert('Błąd', 'Podaj prawidłowy przedział godzin (koniec może być następnego dnia).');
      return;
    }

    if (!validateTimeRange(editData.time, editData.endTime)) {
      setTimeRangeError(true);
      return;
    }

    await onUpdate({ ...editData, durationMinutes });
    setEditVisible(false);
  };

  return (
    <>
      <View style={styles.timelineRow}>
        <View style={styles.timelineLeft}>
          <View style={[styles.timelineDot, { backgroundColor: getCategoryColor(activity.category) }]} />
          {!isLast && <View style={[styles.timelineLine, { backgroundColor: currentColors.border }]} />}
        </View>

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
                  🕐 {formatActivityTimeRange(activity.time, activity.durationMinutes)}
                </Text>
                {activity.cost > 0 && <ActivityCostBadge cost={activity.cost} />}
              </View>
              {activity.description ? (
                <Text style={[styles.activityDesc, { color: currentColors.subtext }]} numberOfLines={2}>
                  {activity.description}
                </Text>
              ) : null}
            </View>

            {editable && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: currentColors.background }]}
                onPress={() => setMenuVisible(true)}
                disabled={saving}
              >
                <Text style={styles.actionBtnIcon}>✏️</Text>
              </TouchableOpacity>
            )}
          </View>

          {activity.location ? (
            <View style={styles.locationTag}>
              <Text style={[styles.locationTagText, { color: currentColors.subtext }]}>📍 {activity.location}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuSheet, { backgroundColor: currentColors.card }]}>
            <Text style={[styles.menuTitle, { color: currentColors.text }]}>{activity.name}</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setTimeRangeError(false);
                setEditData(toActivityInput(activity));
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
                Alert.alert('Usuń aktywność', `Czy na pewno chcesz usunąć "${activity.name}"?`, [
                  { text: 'Anuluj', style: 'cancel' },
                  {
                    text: 'Usuń',
                    style: 'destructive',
                    onPress: () => {
                      void onDelete();
                    },
                  },
                ]);
              }}
            >
              <Text style={styles.menuItemIcon}>🗑️</Text>
              <Text style={styles.menuItemTextDanger}>Usuń</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={editVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.editSheet, { backgroundColor: currentColors.card }]}>
            <Text style={[styles.editTitle, { color: currentColors.text }]}>Edytuj aktywność</Text>

            <Text style={[styles.editLabel, { color: currentColors.subtext }]}>Nazwa</Text>
            <TextInput
              style={[styles.editInput, { color: currentColors.text, borderColor: currentColors.border }]}
              value={editData.name}
              onChangeText={(value) => setEditData({ ...editData, name: value })}
            />

            <Text style={[styles.editLabel, { color: currentColors.subtext }]}>Godziny</Text>
            <View style={[styles.timeRow, timeRangeError && styles.timeRowError]}>
              <View style={styles.timeColumn}>
                <Text style={[styles.editSubLabel, { color: currentColors.subtext }]}>Początek</Text>
                <TimePickerSheet
                  value={editData.time}
                  externalInvalid={timeRangeError}
                  onChange={(time) => {
                    setTimeRangeError(false);
                    setEditData((prev) => ({ ...prev, time }));
                  }}
                  label="Godzina rozpoczęcia"
                  textColor={currentColors.text}
                  subtextColor={currentColors.subtext}
                  borderColor={currentColors.border}
                  cardColor={currentColors.card}
                />
              </View>
              <View style={styles.timeColumn}>
                <Text style={[styles.editSubLabel, { color: currentColors.subtext }]}>Koniec</Text>
                <TimePickerSheet
                  value={editData.endTime}
                  displayValue={formatEndTimeLabel(editData.time, editData.endTime)}
                  externalInvalid={timeRangeError}
                  onChange={(endTime) => {
                    setTimeRangeError(false);
                    setEditData((prev) => ({ ...prev, endTime }));
                  }}
                  label="Godzina zakończenia"
                  textColor={currentColors.text}
                  subtextColor={currentColors.subtext}
                  borderColor={currentColors.border}
                  cardColor={currentColors.card}
                />
              </View>
            </View>
            {timeRangeError ? (
              <Text style={styles.timeRangeErrorText}>{timeRangeErrorMessage}</Text>
            ) : null}

            <Text style={[styles.editLabel, { color: currentColors.subtext }]}>Koszt (PLN)</Text>
            <TextInput
              style={[styles.editInput, { color: currentColors.text, borderColor: currentColors.border }]}
              value={String(editData.cost)}
              onChangeText={(value) => setEditData({ ...editData, cost: parseInt(value, 10) || 0 })}
              keyboardType="numeric"
            />

            <Text style={[styles.editLabel, { color: currentColors.subtext }]}>Opis</Text>
            <TextInput
              style={[styles.editInput, styles.editInputMulti, { color: currentColors.text, borderColor: currentColors.border }]}
              value={editData.description}
              onChangeText={(value) => setEditData({ ...editData, description: value })}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.editLabel, { color: currentColors.subtext }]}>Lokalizacja</Text>
            <TextInput
              style={[styles.editInput, { color: currentColors.text, borderColor: currentColors.border }]}
              value={editData.location}
              onChangeText={(value) => setEditData({ ...editData, location: value })}
            />

            <View style={styles.editButtons}>
              <TouchableOpacity
                style={[styles.editBtnCancel, { borderColor: currentColors.border }]}
                onPress={() => {
                  setTimeRangeError(false);
                  setEditVisible(false);
                }}
              >
                <Text style={[styles.editBtnCancelText, { color: currentColors.text }]}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editBtnSave} onPress={() => void handleSaveEdit()} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.editBtnSaveText}>Zapisz</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function ScheduleDayCard({
  day,
  index,
  allDays,
  editable,
  saving,
  currentColors,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
}: {
  day: TripScheduleDayDto;
  index: number;
  allDays: TripScheduleDayDto[];
  editable: boolean;
  saving: boolean;
  currentColors: ScheduleColors;
  onAddActivity: (dayId: string) => Promise<void>;
  onUpdateActivity: (activityId: string, payload: ActivityInput) => Promise<void>;
  onDeleteActivity: (activityId: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const isActive = expanded;

  return (
    <View style={styles.dayWrapper}>
      <TouchableOpacity
        style={[styles.dayHeader, { backgroundColor: isActive ? '#6366f1' : currentColors.card }]}
        onPress={() => setExpanded((value) => !value)}
        activeOpacity={0.85}
      >
        <View style={[styles.dayNumber, { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : currentColors.background }]}>
          <Text style={[styles.dayNumberText, { color: isActive ? '#fff' : '#6366f1' }]}>{day.dayNumber}</Text>
        </View>

        <View style={styles.dayInfo}>
          <Text style={[styles.dayDate, { color: isActive ? '#fff' : currentColors.text }]}>
            {day.title || `Dzień ${day.dayNumber}`}
          </Text>
          <Text style={[styles.dayWeekday, { color: isActive ? 'rgba(255,255,255,0.75)' : currentColors.subtext }]}>
            {formatDisplayDate(day.date)} · {getDayOfWeek(day.date)} · {day.activities.length} punktów
          </Text>
        </View>

        <Text style={[styles.dayChevron, { color: isActive ? '#fff' : currentColors.subtext }]}>
          {expanded ? '∧' : '∨'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.dayContent, { backgroundColor: currentColors.background }]}>
          {day.activities.length > 0 ? (
            day.activities.map((activity, actIndex) => (
              <ScheduleActivityCard
                key={activity.id}
                activity={activity}
                otherActivities={day.activities.filter((item) => item.id !== activity.id)}
                nextDayActivities={allDays[index + 1]?.activities || []}
                previousDayActivities={allDays[index - 1]?.activities || []}
                isLast={actIndex === day.activities.length - 1}
                editable={editable}
                saving={saving}
                currentColors={currentColors}
                onUpdate={(payload) => onUpdateActivity(activity.id, payload)}
                onDelete={() => onDeleteActivity(activity.id)}
              />
            ))
          ) : (
            <Text style={[styles.emptyDayText, { color: currentColors.subtext }]}>Brak punktów w tym dniu.</Text>
          )}

          {editable && (
            <TouchableOpacity
              style={[styles.addActivityBtn, { borderColor: currentColors.border, opacity: saving ? 0.7 : 1 }]}
              onPress={() => void onAddActivity(day.id)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#6366f1" />
              ) : (
                <>
                  <Text style={styles.addActivityBtnIcon}>+</Text>
                  <Text style={[styles.addActivityBtnText, { color: currentColors.subtext }]}>Dodaj punkt do planu</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

export default function TripScheduleSection({
  days,
  loading,
  editable,
  saving,
  currentColors,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
}: TripScheduleSectionProps) {
  if (loading) {
    return (
      <View style={styles.loaderBox}>
        <ActivityIndicator color="#6366f1" />
        <Text style={[styles.loaderText, { color: currentColors.subtext }]}>Ładowanie harmonogramu...</Text>
      </View>
    );
  }

  if (days.length === 0) {
    return (
      <Text style={[styles.emptyDayText, { color: currentColors.subtext }]}>
        Ten plan nie ma jeszcze harmonogramu.
      </Text>
    );
  }

  return (
    <View style={styles.scheduleList}>
      {days.map((day, index) => (
        <ScheduleDayCard
          key={day.id}
          day={day}
          index={index}
          allDays={days}
          editable={editable}
          saving={saving}
          currentColors={currentColors}
          onAddActivity={onAddActivity}
          onUpdateActivity={onUpdateActivity}
          onDeleteActivity={onDeleteActivity}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scheduleList: {
    gap: 10,
  },
  loaderBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  loaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
  },
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
  dayNumberText: {
    fontSize: 16,
    fontWeight: '800',
  },
  dayInfo: {
    flex: 1,
  },
  dayDate: {
    fontSize: 16,
    fontWeight: '700',
  },
  dayWeekday: {
    fontSize: 13,
    marginTop: 1,
  },
  dayChevron: {
    fontSize: 18,
    fontWeight: '600',
    paddingLeft: 8,
  },
  dayContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  emptyDayText: {
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
    marginRight: 10,
  },
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
  activityCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  activityIcon: {
    fontSize: 20,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  activityMeta: {
    marginTop: 3,
  },
  activityMetaText: {
    fontSize: 12,
  },
  activityDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionBtnIcon: {
    fontSize: 14,
  },
  locationTag: {
    marginTop: 8,
  },
  locationTagText: {
    fontSize: 12,
  },
  addActivityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 10,
    gap: 8,
  },
  addActivityBtnIcon: {
    fontSize: 18,
    color: '#6366f1',
    fontWeight: '700',
  },
  addActivityBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
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
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 14,
  },
  menuItemText: {
    fontSize: 16,
  },
  menuItemTextDanger: {
    fontSize: 16,
    color: '#ef4444',
  },
  editSheet: {
    margin: 16,
    borderRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 12,
  },
  editSubLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeRowError: {
    marginBottom: 4,
  },
  timeRangeErrorText: {
    color: '#ef4444',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  timeColumn: {
    flex: 1,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  editInputMulti: {
    height: 80,
    textAlignVertical: 'top',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  editBtnCancel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  editBtnCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  editBtnSave: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  editBtnSaveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
