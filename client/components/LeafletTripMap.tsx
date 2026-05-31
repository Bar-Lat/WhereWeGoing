import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { MapActivityPoint } from '@/utils/activityMap';
import {
  buildLeafletFitScript,
  buildLeafletFocusScript,
  buildLeafletMapHtml,
  toLeafletMapPoints,
} from '@/utils/leafletMapHtml';

type LeafletTripMapProps = {
  points: MapActivityPoint[];
  selectedIndex: number;
  onMarkerPress: (index: number) => void;
};

export default function LeafletTripMap({ points, selectedIndex, onMarkerPress }: LeafletTripMapProps) {
  const webViewRef = useRef<WebView | null>(null);
  const leafletPoints = useMemo(() => toLeafletMapPoints(points), [points]);
  const mapHtml = useMemo(() => buildLeafletMapHtml(leafletPoints, 0), [leafletPoints]);
  const mapKey = leafletPoints.map((point) => point.key).join('|');

  useEffect(() => {
    if (leafletPoints.length === 0) return;
    webViewRef.current?.injectJavaScript(buildLeafletFocusScript(selectedIndex));
  }, [selectedIndex, leafletPoints.length, mapKey]);

  useEffect(() => {
    if (leafletPoints.length === 0) return;
    const timer = setTimeout(() => {
      webViewRef.current?.injectJavaScript(buildLeafletFitScript());
    }, 300);
    return () => clearTimeout(timer);
  }, [mapKey, leafletPoints.length]);

  const handleLoadEnd = () => {
    if (leafletPoints.length === 0) return;
    webViewRef.current?.injectJavaScript(buildLeafletFocusScript(selectedIndex));
    webViewRef.current?.injectJavaScript(buildLeafletFitScript());
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { type?: string; index?: number };
      if (data.type === 'markerPress' && typeof data.index === 'number') {
        onMarkerPress(data.index);
      }
    } catch {
      // ignore malformed messages
    }
  };

  return (
    <WebView
      key={mapKey}
      ref={webViewRef}
      source={{ html: mapHtml }}
      style={styles.map}
      scrollEnabled={false}
      nestedScrollEnabled
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      onLoadEnd={handleLoadEnd}
      onMessage={handleMessage}
    />
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    backgroundColor: '#eef2f7',
  },
});
