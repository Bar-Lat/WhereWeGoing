import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TimeWheelPicker from '@/components/TimeWheelPicker';
import { Colors } from '@/styles/colors';

type TimePickerSheetProps = {
  value: string;
  displayValue?: string;
  onChange: (time: string) => void;
  onConfirm?: (time: string) => void | Promise<void>;
  externalInvalid?: boolean;
  label?: string;
  textColor?: string;
  subtextColor?: string;
  borderColor?: string;
  cardColor?: string;
  accentColor?: string;
  errorColor?: string;
};

export default function TimePickerSheet({
  value,
  displayValue,
  onChange,
  onConfirm,
  externalInvalid = false,
  label,
  textColor = '#111827',
  subtextColor = '#6b7280',
  borderColor = '#e5e7eb',
  cardColor = '#ffffff',
  accentColor = Colors.brand.blue,
  errorColor = '#ef4444',
}: TimePickerSheetProps) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) {
      setDraft(value);
    }
  }, [visible, value]);

  const handleConfirm = () => {
    onChange(draft);
    setVisible(false);
    void Promise.resolve(onConfirm?.(draft)).catch(() => {
      // Błąd zapisu obsługiwany w rodzicu — picker pozostaje zamknięty.
    });
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => setVisible(true)}
        style={[
          styles.trigger,
          {
            borderColor: externalInvalid ? errorColor : borderColor,
            backgroundColor: externalInvalid ? `${errorColor}10` : cardColor,
          },
        ]}
      >
        <Text style={[styles.triggerText, { color: externalInvalid ? errorColor : textColor }]}>
          {displayValue ?? value}
        </Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: cardColor }]}>
            {!!label && <Text style={[styles.sheetTitle, { color: textColor }]}>{label}</Text>}
            <TimeWheelPicker
              value={draft}
              onChange={setDraft}
              subtextColor={subtextColor}
              borderColor={borderColor}
              accentColor={accentColor}
            />
            <TouchableOpacity
              style={[styles.okButton, { backgroundColor: accentColor }]}
              onPress={handleConfirm}
            >
              <Text style={styles.okButtonText}>Ok</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  triggerText: {
    fontSize: 18,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  okButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  okButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
