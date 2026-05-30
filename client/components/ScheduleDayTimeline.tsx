import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/styles/colors';
import {
  buildTransitLegs,
  type TransitLeg,
  type TransitLegOverride,
} from '@/utils/scheduleTransit';
import { formatActivityTimeRange, recalculateActivityTimesAfterReorder } from '@/utils/activityTime';
import { getCategoryColor, getCategoryIcon } from '@/utils/activityCategory';
import {
  openGoogleMapsBetweenActivities,
  openGoogleMapsFromCurrentLocation,
  type MapLocationInput,
} from '@/utils/googleMapsLinks';

export type TimelineActivityItem = {
  key: string;
  name: string;
  time: string;
  description?: string;
  category: string;
  location?: string;
  cost: number;
  durationMinutes?: number | null;
  coordinates?: unknown;
  imageUrl?: string | null;
};

type ActivityInput = {
  name: string;
  time: string;
  description: string;
  category: string;
  location: string;
  cost: number;
};

type ScheduleColors = {
  background: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
};

type ScheduleDayTimelineProps = {
  activities: TimelineActivityItem[];
  destination: string;
  editable?: boolean;
  saving?: boolean;
  preferredTransport?: string[];
  currentColors: ScheduleColors;
  onEdit?: (index: number) => void;
  onDelete?: (activityKey: string) => void;
  onOrderConfirm?: (orderedItems: TimelineActivityItem[]) => void | Promise<void>;
  transitOverrides?: Array<TransitLegOverride | null | undefined>;
  showTransits?: boolean;
  parentScrollRef?: React.RefObject<ScrollView | null>;
  scrollOffsetRef?: React.RefObject<number>;
};

const toMapLocation = (item: TimelineActivityItem): MapLocationInput => ({
  name: item.name,
  location: item.location,
  coordinates: item.coordinates,
});

function MapsPillButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.mapsPill} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name="navigate-outline" size={14} color={Colors.brand.blue} />
      <Text style={styles.mapsPillText}>Maps</Text>
    </TouchableOpacity>
  );
}

function TransitLegRow({
  leg,
  fromActivity,
  toActivity,
  destination,
}: {
  leg: TransitLeg;
  fromActivity: TimelineActivityItem;
  toActivity: TimelineActivityItem;
  destination: string;
}) {
  return (
    <View style={styles.transitRow}>
      <View style={styles.transitLeftSpacer} />
      <View style={styles.transitBubble}>
        <Ionicons name="swap-horizontal-outline" size={12} color="#94a3b8" />
        <View style={styles.transitTextBox}>
          <Text style={styles.transitTitle}>
            {leg.modeLabel}
            {leg.cost > 0 ? ` · ${leg.cost} PLN` : ''}
          </Text>
          <Text style={styles.transitTime}>{leg.timeRangeLabel}</Text>
        </View>
      </View>
      <MapsPillButton
        onPress={() => {
          void openGoogleMapsBetweenActivities(
            toMapLocation(fromActivity),
            toMapLocation(toActivity),
            destination
          );
        }}
      />
    </View>
  );
}

function TimelineRow({
  item,
  index,
  itemsLength,
  reorderIndex,
  editable,
  saving,
  currentColors,
  onLongPress,
  onMoveUp,
  onMoveDown,
  onConfirm,
  onEdit,
  onDelete,
  rowRef,
  destination,
  showMapActions,
}: {
  item: TimelineActivityItem;
  index: number;
  itemsLength: number;
  reorderIndex: number | null;
  editable: boolean;
  saving: boolean;
  currentColors: ScheduleColors;
  onLongPress: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onConfirm: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  rowRef: (ref: View | null) => void;
  destination: string;
  showMapActions: boolean;
}) {
  const catColor = getCategoryColor(item.category);
  const isReorderMode = reorderIndex === index;
  const canMoveUp = reorderIndex !== null && reorderIndex > 0;
  const canMoveDown = reorderIndex !== null && reorderIndex < itemsLength - 1;
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePressIn = () => {
    if (!editable || saving || reorderIndex !== null) return;
    longPressTimerRef.current = setTimeout(() => {
      onLongPress();
    }, 500);
  };

  const handlePressOut = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <View ref={rowRef} style={styles.timelineRow}>
      <View style={styles.timelineLeft}>
        {isReorderMode ? (
          <View style={styles.reorderControls}>
            <TouchableOpacity
              style={[styles.reorderArrowBtn, !canMoveUp && styles.reorderArrowBtnDisabled]}
              disabled={!canMoveUp || saving}
              onPress={onMoveUp}
            >
              <Ionicons name="chevron-up" size={18} color={canMoveUp ? Colors.brand.blue : '#cbd5e1'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reorderArrowBtn, !canMoveDown && styles.reorderArrowBtnDisabled]}
              disabled={!canMoveDown || saving}
              onPress={onMoveDown}
            >
              <Ionicons name="chevron-down" size={18} color={canMoveDown ? Colors.brand.blue : '#cbd5e1'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reorderArrowBtn, styles.confirmBtn, saving && styles.reorderArrowBtnDisabled]}
              disabled={saving}
              onPress={onConfirm}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.brand.blue} />
              ) : (
                <Ionicons name="checkmark-done-circle" size={18} color="#34d399" />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.timelineDot, { backgroundColor: catColor }]} />
        )}
        {index < itemsLength - 1 && (
          <View style={[styles.timelineLine, { backgroundColor: currentColors.border }]} />
        )}
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        disabled={!editable || saving}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.activityCard, { backgroundColor: currentColors.card, opacity: reorderIndex !== null && !isReorderMode ? 0.55 : 1 }]}
      >
        <View style={styles.activityHeader}>
          <View style={[styles.activityIconBox, { backgroundColor: currentColors.background }]}>
            <Ionicons name={getCategoryIcon(item.category)} size={22} color={catColor} />
          </View>
          <View style={styles.activityInfo}>
            <Text style={[styles.activityName, { color: currentColors.text }]} numberOfLines={2}>
              {item.name}
            </Text>
            <View style={styles.activityMeta}>
              <Text style={[styles.activityMetaText, { color: currentColors.subtext }]}>
                🕐 {formatActivityTimeRange(item.time, item.durationMinutes)}
              </Text>
              {item.cost > 0 && (
                <Text style={[styles.activityCost, { color: Colors.brand.blue }]}>{item.cost} PLN</Text>
              )}
            </View>
            {!!item.description && (
              <Text style={[styles.activityDesc, { color: currentColors.subtext }]} numberOfLines={3}>
                {item.description}
              </Text>
            )}
          </View>

          {editable && reorderIndex === null && (
            <View style={styles.actionRow}>
              {onEdit && (
                <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
                  <Ionicons name="pencil" size={20} color={Colors.brand.blue} />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {showMapActions && (
            <TouchableOpacity
              style={styles.openMapsBtn}
              onPress={() => {
                void openGoogleMapsFromCurrentLocation(toMapLocation(item), destination);
              }}
            >
              <Ionicons name="open-outline" size={20} color={Colors.brand.blue} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default function ScheduleDayTimeline({
  activities,
  destination,
  editable = false,
  saving = false,
  preferredTransport,
  currentColors,
  onEdit,
  onDelete,
  onOrderConfirm,
  transitOverrides,
  showTransits = false,
  parentScrollRef,
  scrollOffsetRef,
}: ScheduleDayTimelineProps) {
  const [items, setItems] = useState(activities);
  const [reorderIndex, setReorderIndex] = useState<number | null>(null);
  const reorderBaselineRef = useRef<TimelineActivityItem[] | null>(null);
  const rowRefs = useRef<Array<View | null>>([]);

  useEffect(() => {
    if (reorderIndex === null) {
      setItems(activities);
      reorderBaselineRef.current = null;
    }
  }, [activities, reorderIndex]);

  const scrollToRow = (index: number) => {
    const row = rowRefs.current[index];
    const scrollView = parentScrollRef?.current as unknown as View | null;
    if (!row || !scrollView) return;

    row.measureInWindow((_rowX, rowY, _rowW, rowH) => {
      scrollView.measureInWindow((_svX: number, svY: number, _svW: number, svH: number) => {
        const currentOffset = scrollOffsetRef?.current ?? 0;
        const rowBottom = rowY + rowH;
        const viewportBottom = svY + svH;
        const rowTop = rowY;
        const viewportTop = svY + 140;

        let targetOffset = currentOffset;
        if (rowBottom > viewportBottom - 24) {
          targetOffset = currentOffset + (rowBottom - viewportBottom) + 32;
        } else if (rowTop < viewportTop) {
          targetOffset = currentOffset - (viewportTop - rowTop) - 16;
        }

        parentScrollRef?.current?.scrollTo({
          y: Math.max(0, targetOffset),
          animated: true,
        });
      });
    });
  };

  useEffect(() => {
    if (reorderIndex === null) return;
    const timer = setTimeout(() => scrollToRow(reorderIndex), 80);
    return () => clearTimeout(timer);
  }, [reorderIndex, items]);

  const transitLegs = useMemo(() => {
    if (!showTransits) return [];

    return buildTransitLegs(
      items.map((item) => ({
        name: item.name,
        location: item.location,
        category: item.category,
        time: item.time,
        durationMinutes: item.durationMinutes,
      })),
      { preferredTransport, overrides: transitOverrides }
    );
  }, [items, preferredTransport, showTransits, transitOverrides]);

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) return;

    const baseline = reorderBaselineRef.current;
    if (!baseline) return;

    setItems((current) => {
      const next = current.map((entry) => ({ ...entry }));
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return recalculateActivityTimesAfterReorder(next, baseline);
    });
    setReorderIndex(toIndex);
  };

  const handleConfirmReorder = async () => {
    const orderedItems = items;
    setReorderIndex(null);
    reorderBaselineRef.current = null;
    if (onOrderConfirm) {
      await onOrderConfirm(orderedItems);
    }
  };

  const startReorder = (index: number) => {
    reorderBaselineRef.current = items.map((entry) => ({ ...entry }));
    setReorderIndex(index);
  };

  if (items.length === 0) {
    return (
      <Text style={[styles.emptyDayText, { color: currentColors.subtext }]}>
        Brak punktów w tym dniu.
      </Text>
    );
  }

  return (
    <View>
      {items.map((item, index) => (
        <View key={item.key}>
          <TimelineRow
            item={item}
            index={index}
            itemsLength={items.length}
            reorderIndex={reorderIndex}
            editable={editable}
            saving={saving}
            currentColors={currentColors}
            onLongPress={() => startReorder(index)}
            onMoveUp={() => moveItem(reorderIndex ?? index, (reorderIndex ?? index) - 1)}
            onMoveDown={() => moveItem(reorderIndex ?? index, (reorderIndex ?? index) + 1)}
            onConfirm={() => {
              void handleConfirmReorder();
            }}
            onEdit={onEdit ? () => onEdit(index) : undefined}
            onDelete={onDelete ? () => onDelete(item.key) : undefined}
            rowRef={(ref) => {
              rowRefs.current[index] = ref;
            }}
            destination={destination}
            showMapActions={!editable}
          />
          {index < items.length - 1 && transitLegs[index] && (
            <TransitLegRow
              leg={transitLegs[index]!}
              fromActivity={items[index]}
              toActivity={items[index + 1]}
              destination={destination}
            />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyDayText: { fontSize: 14, paddingVertical: 8 },
  timelineRow: { flexDirection: 'row', marginBottom: 4 },
  timelineLeft: { width: 44, alignItems: 'center' },
  timelineDot: { width: 14, height: 14, borderRadius: 7, marginTop: 18, zIndex: 2 },
  timelineLine: { width: 2, flex: 1, marginTop: 4, marginBottom: -8 },
  activityCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activityHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  activityIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  activityMeta: { marginBottom: 4 },
  activityMetaText: { fontSize: 13 },
  activityCost: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  activityDesc: { fontSize: 13, lineHeight: 18 },
  actionRow: { flexDirection: 'row', marginLeft: 4 },
  actionBtn: { padding: 6 },
  openMapsBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    marginLeft: 4,
  },
  reorderControls: { alignItems: 'center', gap: 4, marginTop: 8 },
  reorderArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  reorderArrowBtnDisabled: { opacity: 0.45 },
  confirmBtn: { marginTop: 0 },
  transitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  transitLeftSpacer: { width: 44 },
  transitBubble: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.14)',
  },
  transitTextBox: { flex: 1, minWidth: 0 },
  transitTitle: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  transitTime: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  mapsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  mapsPillText: {
    color: Colors.brand.blue,
    fontSize: 12,
    fontWeight: '700',
  },
});
