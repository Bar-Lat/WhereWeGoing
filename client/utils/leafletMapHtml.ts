import { getCategoryColor, getCategoryIconSvg } from '@/utils/activityCategory';
import type { MapActivityPoint } from '@/utils/activityMap';

export type LeafletMapPoint = {
  key: string;
  orderNumber: number;
  name: string;
  lat: number;
  lng: number;
  color: string;
  iconSvg: string;
  imageUrl?: string | null;
};

export const toLeafletMapPoints = (points: MapActivityPoint[]): LeafletMapPoint[] =>
  points.map((point) => ({
    key: point.key,
    orderNumber: point.orderNumber,
    name: point.name,
    lat: point.coordinates.latitude,
    lng: point.coordinates.longitude,
    color: getCategoryColor(point.category),
    iconSvg: getCategoryIconSvg(point.category),
    imageUrl: point.imageUrl,
  }));

export const buildLeafletMapHtml = (points: LeafletMapPoint[], selectedIndex = 0): string => {
  const payload = JSON.stringify(points).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #eef2f7; }
    .leaflet-container { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .plan-marker { position: relative; width: 58px; height: 54px; }
    .plan-marker .circle {
      position: absolute;
      top: 0;
      left: 7px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 3px solid var(--marker-color);
      background: #fff;
      box-sizing: border-box;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.22);
    }
    .plan-marker .circle.fill { background: var(--marker-color); }
    .plan-marker .circle img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .plan-marker .circle svg { width: 22px; height: 22px; display: block; }
    .plan-marker .badge {
      position: absolute;
      right: 0;
      bottom: 0;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #111827;
      color: #fff;
      font-size: 11px;
      font-weight: 800;
      line-height: 22px;
      text-align: center;
      border: 2px solid #fff;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.25);
    }
    .plan-marker.selected .circle {
      transform: scale(1.08);
      border-width: 4px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.28);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const points = ${payload};
    let selectedIndex = ${selectedIndex};
    let map = null;
    let markers = [];

    function buildMarkerHtml(point, selected) {
      const selectedClass = selected ? ' selected' : '';
      const circleClass = point.imageUrl ? 'circle' : 'circle fill';
      const inner = point.imageUrl
        ? '<img src="' + point.imageUrl.replace(/"/g, '&quot;') + '" alt="" />'
        : '<svg viewBox="0 0 24 24">' + point.iconSvg + '</svg>';

      return '<div class="plan-marker' + selectedClass + '" style="--marker-color:' + point.color + '">' +
        '<div class="' + circleClass + '" style="--marker-color:' + point.color + '">' + inner + '</div>' +
        '<div class="badge">' + point.orderNumber + '</div></div>';
    }

    function createMarkerIcon(point, selected) {
      return L.divIcon({
        className: '',
        html: buildMarkerHtml(point, selected),
        iconSize: [58, 54],
        iconAnchor: [29, 22],
      });
    }

    function refreshMarkerStyles() {
      markers.forEach(function(entry, index) {
        entry.setIcon(createMarkerIcon(points[index], index === selectedIndex));
      });
    }

    window.focusMarker = function(index) {
      if (!points[index] || !map) return;
      selectedIndex = index;
      refreshMarkerStyles();
      map.setView([points[index].lat, points[index].lng], Math.max(map.getZoom(), 15), { animate: true });
    };

    window.fitAllMarkers = function() {
      if (!map || !points.length) return;
      if (points.length === 1) {
        map.setView([points[0].lat, points[0].lng], 15);
        return;
      }
      const bounds = L.latLngBounds(points.map(function(point) { return [point.lat, point.lng]; }));
      map.fitBounds(bounds, { padding: [36, 36] });
    };

    function initMap() {
      map = L.map('map', { zoomControl: true, attributionControl: true }).setView([52.2297, 21.0122], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      markers = points.map(function(point, index) {
        const marker = L.marker([point.lat, point.lng], {
          icon: createMarkerIcon(point, index === selectedIndex),
          title: point.orderNumber + '. ' + point.name,
        });
        marker.on('click', function() {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', index: index }));
          }
          window.focusMarker(index);
        });
        marker.addTo(map);
        return marker;
      });

      setTimeout(function() {
        window.fitAllMarkers();
        refreshMarkerStyles();
      }, 120);
    }

    initMap();
  </script>
</body>
</html>`;
};

export const buildLeafletFocusScript = (index: number) => `window.focusMarker(${index}); true;`;

export const buildLeafletFitScript = () => 'window.fitAllMarkers(); true;';

export const buildLeafletPickerHtml = (
  initialLat: number,
  initialLng: number,
  initialZoom = 14,
  markerLat?: number | null,
  markerLng?: number | null
): string => {
  const hasMarker = markerLat != null && markerLng != null;
  const markerLatValue = hasMarker ? markerLat : 'null';
  const markerLngValue = hasMarker ? markerLng : 'null';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #eef2f7; }
    .picker-marker {
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      background: #498ee6;
      border: 3px solid #fff;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.28);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    let map = null;
    let marker = null;
    let markerLat = ${markerLatValue};
    let markerLng = ${markerLngValue};

    function postMessage(payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }

    function createMarkerIcon() {
      return L.divIcon({
        className: '',
        html: '<div class="picker-marker"></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
    }

    function setMarker(lat, lng, notify) {
      markerLat = lat;
      markerLng = lng;
      if (!map) return;
      if (marker) {
        marker.setLatLng([lat, lng]);
      } else {
        marker = L.marker([lat, lng], { icon: createMarkerIcon(), draggable: true }).addTo(map);
        marker.on('dragend', function(event) {
          const pos = event.target.getLatLng();
          setMarker(pos.lat, pos.lng, true);
        });
      }
      if (notify) {
        postMessage({ type: 'pick', lat: lat, lng: lng });
      }
    }

    window.setPickerCenter = function(lat, lng, zoom) {
      if (!map) return;
      map.setView([lat, lng], zoom || map.getZoom(), { animate: true });
    };

    function initMap() {
      map = L.map('map', { zoomControl: true, attributionControl: true }).setView([${initialLat}, ${initialLng}], ${initialZoom});
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      map.on('click', function(event) {
        setMarker(event.latlng.lat, event.latlng.lng, true);
      });

      if (markerLat !== null && markerLng !== null) {
        setMarker(markerLat, markerLng, false);
      }
    }

    initMap();
  </script>
</body>
</html>`;
};

export const buildLeafletPickerCenterScript = (lat: number, lng: number, zoom = 14) =>
  `window.setPickerCenter(${lat}, ${lng}, ${zoom}); true;`;
