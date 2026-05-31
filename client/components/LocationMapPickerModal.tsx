import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/styles/colors';
import type { ActivityCoordinates } from '@/utils/activityMap';
import { buildLeafletPickerCenterScript, buildLeafletPickerHtml } from '@/utils/leafletMapHtml';

type LocationMapPickerModalProps = {
  visible: boolean;
  initialCenter: ActivityCoordinates | null;
  selectedCoordinates: ActivityCoordinates | null;
  currentColors: {
    background: string;
    card: string;
    text: string;
    subtext: string;
    border: string;
  };
  onClose: () => void;
  onConfirm: (coordinates: ActivityCoordinates) => void;
};

const DEFAULT_CENTER: ActivityCoordinates = { latitude: 52.2297, longitude: 21.0122 };

export default function LocationMapPickerModal({
  visible,
  initialCenter,
  selectedCoordinates,
  currentColors,
  onClose,
  onConfirm,
}: LocationMapPickerModalProps) {
  const webViewRef = useRef<WebView | null>(null);
  const [draftCoordinates, setDraftCoordinates] = useState<ActivityCoordinates | null>(selectedCoordinates);
  const center = initialCenter ?? selectedCoordinates ?? DEFAULT_CENTER;

  useEffect(() => {
    if (!visible) return;
    setDraftCoordinates(selectedCoordinates);
  }, [visible, selectedCoordinates]);

  const mapHtml = useMemo(
    () =>
      buildLeafletPickerHtml(
        center.latitude,
        center.longitude,
        14,
        draftCoordinates?.latitude ?? selectedCoordinates?.latitude ?? null,
        draftCoordinates?.longitude ?? selectedCoordinates?.longitude ?? null
      ),
    [center.latitude, center.longitude, draftCoordinates, selectedCoordinates]
  );

  const handleLoadEnd = () => {
    webViewRef.current?.injectJavaScript(buildLeafletPickerCenterScript(center.latitude, center.longitude, 14));
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { type?: string; lat?: number; lng?: number };
      if (data.type === 'pick' && typeof data.lat === 'number' && typeof data.lng === 'number') {
        setDraftCoordinates({ latitude: data.lat, longitude: data.lng });
      }
    } catch {
      // ignore malformed messages
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: currentColors.background }]}>
        <View style={[styles.header, { backgroundColor: currentColors.card, borderBottomColor: currentColors.border }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color={currentColors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { color: currentColors.text }]}>Wybierz na mapie</Text>
            <Text style={[styles.headerSubtitle, { color: currentColors.subtext }]}>
              Dotknij mapy, aby wskazać miejsce
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.headerBtn, styles.confirmBtn, { opacity: draftCoordinates ? 1 : 0.45 }]}
            disabled={!draftCoordinates}
            onPress={() => {
              if (draftCoordinates) onConfirm(draftCoordinates);
            }}
          >
            <Ionicons name="checkmark" size={24} color={Colors.brand.blue} />
          </TouchableOpacity>
        </View>

        <View style={styles.mapWrap}>
          {!visible ? (
            <View style={styles.loader}>
              <ActivityIndicator color={Colors.brand.blue} />
            </View>
          ) : (
            <WebView
              ref={webViewRef}
              source={{ html: mapHtml }}
              style={styles.map}
              scrollEnabled={false}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              onLoadEnd={handleLoadEnd}
              onMessage={handleMessage}
            />
          )}
        </View>

        <View style={[styles.footer, { backgroundColor: currentColors.card, borderTopColor: currentColors.border }]}>
          <Text style={[styles.footerText, { color: currentColors.subtext }]}>
            {draftCoordinates
              ? `${draftCoordinates.latitude.toFixed(5)}, ${draftCoordinates.longitude.toFixed(5)}`
              : 'Brak wybranego punktu'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    backgroundColor: 'rgba(73, 142, 230, 0.12)',
    borderRadius: 20,
  },
  headerTextWrap: { flex: 1, paddingHorizontal: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  mapWrap: { flex: 1 },
  map: { flex: 1, backgroundColor: '#eef2f7' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  footerText: { fontSize: 13, textAlign: 'center' },
});
