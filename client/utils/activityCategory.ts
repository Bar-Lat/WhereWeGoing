import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/styles/colors';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  transport: 'bus-outline',
  jedzenie: 'restaurant-outline',
  food: 'restaurant-outline',
  atrakcja: 'business-outline',
  attraction: 'business-outline',
  nocleg: 'bed-outline',
  accommodation: 'bed-outline',
  inne: 'bookmark-outline',
  other: 'bookmark-outline',
};

const CATEGORY_COLORS: Record<string, string> = {
  transport: '#f59e0b',
  jedzenie: '#10b981',
  food: '#10b981',
  atrakcja: Colors.brand.blue,
  attraction: Colors.brand.blue,
  nocleg: '#3b82f6',
  accommodation: '#3b82f6',
  inne: '#8b5cf6',
  other: '#8b5cf6',
};

export const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap =>
  CATEGORY_ICONS[category?.toLowerCase()] ?? 'location-outline';

export const getCategoryColor = (category: string): string =>
  CATEGORY_COLORS[category?.toLowerCase()] ?? Colors.brand.blue;

const CATEGORY_ICON_SVGS: Record<string, string> = {
  transport: '<path fill="#fff" d="M6 18v-1h12v1H6zm2.5-8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM5 11l1.5-5h13L21 11v5H5v-5z"/>',
  jedzenie: '<path fill="#fff" d="M8 3v8H6V3h2zm4 0v8h-2V3h2zm4 0v8h-2V3h2zM4 13h16v2H4v-2z"/>',
  food: '<path fill="#fff" d="M8 3v8H6V3h2zm4 0v8h-2V3h2zm4 0v8h-2V3h2zM4 13h16v2H4v-2z"/>',
  atrakcja: '<path fill="#fff" d="M4 21V3h7v6h9v12H4zm9-8h7V11h-7v2z"/>',
  attraction: '<path fill="#fff" d="M4 21V3h7v6h9v12H4zm9-8h7V11h-7v2z"/>',
  nocleg: '<path fill="#fff" d="M3 19V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14H3zm4-2h10V7H7v10z"/>',
  accommodation: '<path fill="#fff" d="M3 19V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14H3zm4-2h10V7H7v10z"/>',
  inne: '<path fill="#fff" d="M6 2h12v18l-6-3-6 3V2z"/>',
  other: '<path fill="#fff" d="M6 2h12v18l-6-3-6 3V2z"/>',
};

export const getCategoryIconSvg = (category: string): string =>
  CATEGORY_ICON_SVGS[category?.toLowerCase()] ??
  '<path fill="#fff" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/>';
