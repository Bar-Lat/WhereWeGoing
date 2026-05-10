import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Colors } from '@/styles/colors';

// Polska lokalizacja kalendarza
LocaleConfig.locales['pl'] = {
  monthNames: [
    'Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec',
    'Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'
  ],
  monthNamesShort: [
    'Sty','Lut','Mar','Kwi','Maj','Cze',
    'Lip','Sie','Wrz','Paź','Lis','Gru'
  ],
  dayNames: ['Niedziela','Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota'],
  dayNamesShort: ['Nd','Pn','Wt','Śr','Cz','Pt','Sb'],
  today: 'Dziś',
};
LocaleConfig.defaultLocale = 'pl';

// Konwersja YYYY-MM-DD → dd.mm.rrrr
function toDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
}

// Konwersja dd.mm.rrrr → YYYY-MM-DD
function toISODate(dateStr: string): string {
  if (!dateStr) return '';
  const [day, month, year] = dateStr.split('.');
  return `${year}-${month}-${day}`;
}

interface DateRangePickerProps {
  departureDate: string; // dd.mm.rrrr
  returnDate: string;    // dd.mm.rrrr
  onDatesChange: (departure: string, returnDate: string) => void;
}

export default function DateRangePicker({ 
  departureDate, 
  returnDate, 
  onDatesChange 
}: DateRangePickerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  // Konwertuj do ISO dla kalendarza
  const [startISO, setStartISO] = useState(
    departureDate ? toISODate(departureDate) : ''
  );
  const [endISO, setEndISO] = useState(
    returnDate ? toISODate(returnDate) : ''
  );
  const [selectingEnd, setSelectingEnd] = useState(!!startISO);

  // Dzisiejsza data jako minimum
  const today = new Date().toISOString().split('T')[0];

  // Buduj markedDates dla kalendarza
  const buildMarkedDates = () => {
    const marked: Record<string, any> = {};

    if (!startISO) return marked;

    if (startISO && !endISO) {
      marked[startISO] = {
        selected: true,
        startingDay: true,
        endingDay: true,
        color: '#6366f1',
        textColor: '#fff',
      };
      return marked;
    }

    if (startISO && endISO) {
      // Wypełnij zakres
      const start = new Date(startISO);
      const end = new Date(endISO);
      const current = new Date(start);

      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const isStart = dateStr === startISO;
        const isEnd = dateStr === endISO;

        marked[dateStr] = {
          color: isStart || isEnd ? '#6366f1' : '#818cf8',
          textColor: '#fff',
          startingDay: isStart,
          endingDay: isEnd,
        };

        current.setDate(current.getDate() + 1);
      }
    }

    return marked;
  };

  const handleDayPress = (day: { dateString: string }) => {
    const selected = day.dateString;

    // Nie pozwól wybrać przeszłości
    if (selected < today) return;

    if (!startISO || (!selectingEnd && startISO)) {
      // Pierwszy wybór — data wylotu
      setStartISO(selected);
      setEndISO('');
      setSelectingEnd(true);
      onDatesChange(toDisplayDate(selected), '');
    } else {
      // Drugi wybór — data powrotu
      if (selected < startISO) {
        // Jeśli powrót wcześniej niż wylot — resetuj
        setStartISO(selected);
        setEndISO('');
        onDatesChange(toDisplayDate(selected), '');
      } else {
        setEndISO(selected);
        setSelectingEnd(false);
        onDatesChange(toDisplayDate(startISO), toDisplayDate(selected));
      }
    }
  };

  const handleReset = () => {
    setStartISO('');
    setEndISO('');
    setSelectingEnd(false);
    onDatesChange('', '');
  };

  // Szybkie wybory
  const handleQuickSelect = (days: number) => {
    const start = new Date();
    start.setDate(start.getDate() + 1); // jutro
    const end = new Date(start);
    end.setDate(end.getDate() + days - 1);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    setStartISO(startStr);
    setEndISO(endStr);
    setSelectingEnd(false);
    onDatesChange(toDisplayDate(startStr), toDisplayDate(endStr));
  };

  const totalDays = startISO && endISO
    ? Math.round((new Date(endISO).getTime() - new Date(startISO).getTime()) / 86400000) + 1
    : 0;

  return (
    <View>
      {/* Szybkie wybory */}
      <View style={styles.quickRow}>
        {[
          { label: '🌙 Weekend', days: 3 },
          { label: '📆 Tydzień', days: 7 },
          { label: '🗺️ 2 tygodnie', days: 14 },
        ].map((q) => (
          <TouchableOpacity
            key={q.days}
            style={[styles.quickBtn, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}
            onPress={() => handleQuickSelect(q.days)}
          >
            <Text style={[styles.quickBtnText, { color: currentColors.text }]}>{q.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Instrukcja */}
      <Text style={[styles.hint, { color: currentColors.subtext }]}>
        {!startISO
          ? '👆 Wybierz datę wylotu'
          : !endISO
          ? '👆 Wybierz datę powrotu'
          : `✅ ${totalDays} ${totalDays === 1 ? 'dzień' : 'dni'} — ${toDisplayDate(startISO)} → ${toDisplayDate(endISO)}`}
      </Text>

      {/* Kalendarz */}
      <Calendar
        markingType="period"
        markedDates={buildMarkedDates()}
        onDayPress={handleDayPress}
        minDate={today}
        firstDay={1}
        theme={{
          backgroundColor: currentColors.card,
          calendarBackground: currentColors.card,
          textSectionTitleColor: currentColors.subtext,
          selectedDayBackgroundColor: '#6366f1',
          selectedDayTextColor: '#fff',
          todayTextColor: '#6366f1',
          dayTextColor: currentColors.text,
          textDisabledColor: currentColors.border,
          dotColor: '#6366f1',
          arrowColor: '#6366f1',
          monthTextColor: currentColors.text,
          textDayFontWeight: '500',
          textMonthFontWeight: '700',
          textDayHeaderFontWeight: '600',
        }}
        style={[styles.calendar, { backgroundColor: currentColors.card }]}
      />

      {/* Reset */}
      {(startISO || endISO) && (
        <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
          <Text style={styles.resetText}>✕ Wyczyść daty</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
  },
  calendar: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  resetBtn: {
    alignItems: 'center',
    marginTop: 12,
  },
  resetText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '500',
  },
});