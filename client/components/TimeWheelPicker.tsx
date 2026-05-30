import React, { useEffect, useMemo, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors } from '@/styles/colors';

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const SELECTION_TOP = ITEM_HEIGHT * 2;

type TimeWheelPickerProps = {
  value: string;
  onChange: (time: string) => void;
  subtextColor?: string;
  borderColor?: string;
  accentColor?: string;
  hasError?: boolean;
  errorColor?: string;
};

const parseTime = (value: string) => {
  const match = value?.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return { hour: 9, minute: 0 };
  }

  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return { hour: 9, minute: 0 };
  }

  return { hour, minute };
};

const formatTime = (hour: number, minute: number) =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

type WheelColumnProps = {
  items: string[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  subtextColor: string;
  accentColor: string;
};

function WheelColumn({
  items,
  selectedIndex,
  onIndexChange,
  subtextColor,
  accentColor,
}: WheelColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (isDraggingRef.current) return;
    scrollRef.current?.scrollTo({
      y: selectedIndex * ITEM_HEIGHT,
      animated: false,
    });
  }, [selectedIndex]);

  const snapToIndex = (offsetY: number) => {
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    scrollRef.current?.scrollTo({
      y: clamped * ITEM_HEIGHT,
      animated: true,
    });
    if (clamped !== selectedIndex) {
      onIndexChange(clamped);
    }
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    isDraggingRef.current = false;
    snapToIndex(event.nativeEvent.contentOffset.y);
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.wheelColumn}
      contentContainerStyle={styles.wheelContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      onScrollBeginDrag={() => {
        isDraggingRef.current = true;
      }}
      onMomentumScrollEnd={handleScrollEnd}
      onScrollEndDrag={handleScrollEnd}
    >
      {items.map((label, index) => {
        const isSelected = index === selectedIndex;
        return (
          <View key={`${label}-${index}`} style={styles.wheelItem}>
            <Text
              style={[
                styles.wheelItemText,
                { color: isSelected ? accentColor : subtextColor },
                isSelected && styles.wheelItemTextSelected,
              ]}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

export default function TimeWheelPicker({
  value,
  onChange,
  subtextColor = '#6b7280',
  borderColor = '#e5e7eb',
  accentColor = Colors.brand.blue,
  hasError = false,
  errorColor = '#ef4444',
}: TimeWheelPickerProps) {
  const parsed = useMemo(() => parseTime(value), [value]);
  const activeColor = hasError ? errorColor : accentColor;
  const activeBorderColor = hasError ? errorColor : borderColor;

  const hourLabels = useMemo(
    () => Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0')),
    []
  );
  const minuteLabels = useMemo(
    () => Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, '0')),
    []
  );

  const updateTime = (hour: number, minute: number) => {
    onChange(formatTime(hour, minute));
  };

  return (
    <View style={[styles.container, { borderColor: activeBorderColor }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.columnLabel, { color: subtextColor }]}>Godz.</Text>
        <View style={styles.separatorSpacer} />
        <Text style={[styles.columnLabel, { color: subtextColor }]}>Min.</Text>
      </View>

      <View style={styles.wheelsContainer}>
        <View
          pointerEvents="none"
          style={[
            styles.selectionBand,
            {
              borderColor: activeBorderColor,
              backgroundColor: hasError ? `${errorColor}18` : `${activeColor}12`,
            },
          ]}
        />

        <View style={styles.columnsRow}>
          <View style={styles.columnWrap}>
            <WheelColumn
              items={hourLabels}
              selectedIndex={parsed.hour}
              onIndexChange={(hour) => updateTime(hour, parsed.minute)}
              subtextColor={subtextColor}
              accentColor={activeColor}
            />
          </View>

          <View style={styles.separatorWrap}>
            <Text style={[styles.separator, { color: activeColor }]}>:</Text>
          </View>

          <View style={styles.columnWrap}>
            <WheelColumn
              items={minuteLabels}
              selectedIndex={parsed.minute}
              onIndexChange={(minute) => updateTime(parsed.hour, minute)}
              subtextColor={subtextColor}
              accentColor={activeColor}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 12,
  },
  columnLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  separatorSpacer: {
    width: 28,
  },
  wheelsContainer: {
    height: WHEEL_HEIGHT,
    position: 'relative',
  },
  selectionBand: {
    position: 'absolute',
    top: SELECTION_TOP,
    left: 12,
    right: 12,
    height: ITEM_HEIGHT,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 1,
  },
  columnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: WHEEL_HEIGHT,
    paddingHorizontal: 8,
  },
  columnWrap: {
    flex: 1,
  },
  separatorWrap: {
    width: 28,
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelColumn: {
    height: WHEEL_HEIGHT,
    width: '100%',
  },
  wheelContent: {
    paddingVertical: SELECTION_TOP,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelItemText: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: ITEM_HEIGHT,
    textAlign: 'center',
  },
  wheelItemTextSelected: {
    fontWeight: '800',
  },
  separator: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: ITEM_HEIGHT,
    textAlign: 'center',
  },
});
