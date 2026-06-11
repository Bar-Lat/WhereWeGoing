import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  PanResponder,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '@/styles/create.styles';
import DateRangePicker from './DateRangePicker';
import { getMyFriends } from '@/services/friends.api';
import type { FriendProfile } from '@/types/friends';
import { Colors } from '@/styles/colors';

// ─── TYPY ────────────────────────────────────────────────────────────────────

export interface TripFormData {
  destination: string;
  departureDate: string;
  returnDate: string;
  travelers: number;
  budget: number;
  interests: string[];
  transport: string[];
  attractionsPerDay: number;
  selectedFriendIds: string[];
  originLabel?: string | null;
  originCoordinates?: { latitude: number; longitude: number } | null;
}

interface StepProps {
  formData: TripFormData;
  setFormData: (data: TripFormData) => void;
  currentColors: any;
  accessToken?: string | null;
}

// ─── DANE STATYCZNE (Poprawione ikony Ionicons) ─────────────────────────────

export const POPULAR_DESTINATIONS = [
  { city: 'Paryż',     country: 'FR', price: 1400 },
  { city: 'Rzym',      country: 'IT', price: 1200 },
  { city: 'Barcelona', country: 'ES', price: 990  },
  { city: 'Praga',     country: 'CZ', price: 650  },
  { city: 'Londyn',    country: 'GB', price: 1600 },
  { city: 'Amsterdam', country: 'NL', price: 1100 },
];

export const INTERESTS: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'sightseeing', label: 'Zwiedzanie', icon: 'library-outline' },
  { id: 'food',        label: 'Jedzenie',   icon: 'restaurant-outline' },
  { id: 'nature',      label: 'Natura',     icon: 'leaf-outline' },
  { id: 'parties',     label: 'Imprezy',    icon: 'wine-outline' },
  { id: 'shopping',    label: 'Zakupy',     icon: 'bag-outline' }, // Poprawione z bag-handle-outline
  { id: 'art',         label: 'Sztuka',     icon: 'color-palette-outline' },
  { id: 'sport',       label: 'Sport',      icon: 'football-outline' },
  { id: 'beach',       label: 'Plaża',      icon: 'umbrella-outline' },
];

export const TRANSPORT_OPTIONS: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'walking', label: 'Pieszo',    icon: 'walk-outline' },
  { id: 'metro',   label: 'Metro/Bus', icon: 'train-outline' },
  { id: 'car',     label: 'Samochód',  icon: 'car-outline' },
  { id: 'bike',    label: 'Rower',     icon: 'bicycle-outline' },
];

// ─── CUSTOM SLIDER ────────────────────────────────────────────────────────────

export function CustomSlider({ value, onValueChange, min, max, step }: { value: number; onValueChange: (value: number) => void; min: number; max: number; step: number; }) {
  const sliderRef = useRef<View>(null);
  const [sliderPosition, setSliderPosition] = useState(0);
  const [sliderWidth] = useState(300);
  const thumbSize = 28; // Nieco większy thumb dla lepszego UX

  const calculateValue = (x: number) => {
    const relativeX = x - sliderPosition;
    const percentage = Math.max(0, Math.min(1, relativeX / sliderWidth));
    const rawValue = min + percentage * (max - min);
    return Math.round(rawValue / step) * step;
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => onValueChange(calculateValue(evt.nativeEvent.pageX)),
    onPanResponderMove: (evt) => onValueChange(calculateValue(evt.nativeEvent.pageX)),
  });

  const percentage = (value - min) / (max - min);
  const thumbPosition = percentage * sliderWidth;

  return (
    <View
      style={[styles.sliderContainer, { paddingVertical: 10 }]}
      onLayout={(event) => setSliderPosition(event.nativeEvent.layout.x)}
    >
      <View ref={sliderRef} style={[styles.sliderTrack, { height: 6, borderRadius: 3, backgroundColor: 'rgba(99, 102, 241, 0.15)' }]} {...panResponder.panHandlers}>
        <View style={[styles.sliderFill, { width: thumbPosition, height: 6, borderRadius: 3, backgroundColor: Colors.brand.blue }]} />
        <View style={[
          styles.sliderThumb, 
          { 
            left: thumbPosition - thumbSize / 2, 
            width: thumbSize, 
            height: thumbSize, 
            borderRadius: thumbSize / 2, 
            backgroundColor: '#fff',
            borderWidth: 2,
            borderColor: Colors.brand.blue,
            shadowColor: Colors.brand.blue,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 5,
            top: -11 // wyrównanie
          }
        ]} />
      </View>
    </View>
  );
}

// ─── KROK 1 — Destination ────────────────────────────────────────────────────

export function Step1({ formData, setFormData, currentColors }: StepProps) {
  return (
    <View style={styles.stepContainer}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <View style={{ padding: 8, backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: 12 }}>
          <Ionicons name="earth" size={24} color={Colors.brand.blue} />
        </View>
        <Text style={[styles.stepTitle, { color: currentColors.text, marginBottom: 0, fontSize: 22, fontWeight: '800' }]}>
          Dokąd chcesz pojechać?
        </Text>
      </View>
      <Text style={[styles.stepSubtitle, { color: currentColors.subtext, marginBottom: 24 }]}>
        Wpisz miasto lub kraj docelowy i rozpocznij przygodę.
      </Text>

      <View style={[
        styles.inputContainer, 
        { 
          backgroundColor: currentColors.card, 
          borderColor: formData.destination ? Colors.brand.blue : currentColors.border, 
          borderWidth: 1.5,
          borderRadius: 16,
          flexDirection: 'row', 
          alignItems: 'center', 
          paddingHorizontal: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 2
        }
      ]}>
        <Ionicons name="search" size={22} color={formData.destination ? Colors.brand.blue : currentColors.subtext} style={{ marginRight: 10 }} />
        <TextInput
          style={[styles.input, { color: currentColors.text, flex: 1, paddingVertical: 16, fontSize: 16, fontWeight: '500' }]}
          placeholder="np. Paryż, Francja"
          placeholderTextColor={currentColors.subtext}
          value={formData.destination}
          onChangeText={(text) => setFormData({ ...formData, destination: text })}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: currentColors.subtext, marginTop: 32, marginBottom: 16, fontSize: 13, fontWeight: '700', letterSpacing: 1 }]}>POPULARNE KIERUNKI</Text>

      <View style={[styles.destinationsGrid, { gap: 12 }]}>
        {POPULAR_DESTINATIONS.map((dest) => {
          const isSelected = formData.destination === dest.city;
          return (
            <TouchableOpacity
              key={dest.city}
              style={[
                styles.destinationCard,
                { 
                  backgroundColor: isSelected ? Colors.brand.blue : currentColors.card, 
                  borderColor: isSelected ? Colors.brand.blue : currentColors.border,
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 16,
                  shadowColor: isSelected ? Colors.brand.blue : '#000',
                  shadowOffset: { width: 0, height: isSelected ? 6 : 2 },
                  shadowOpacity: isSelected ? 0.25 : 0.05,
                  shadowRadius: isSelected ? 8 : 4,
                  elevation: isSelected ? 6 : 1
                }
              ]}
              onPress={() => setFormData({ ...formData, destination: dest.city })}
            >
              <Text style={[styles.destinationCountry, { color: isSelected ? 'rgba(255,255,255,0.8)' : currentColors.subtext, fontSize: 12, fontWeight: '600', marginBottom: 4 }]}>{dest.country}</Text>
              <Text style={[styles.destinationCity, { color: isSelected ? '#fff' : currentColors.text, fontSize: 18, fontWeight: '800', marginBottom: 8 }]}>{dest.city}</Text>
              <Text style={[styles.destinationPrice, { color: isSelected ? 'rgba(255,255,255,0.9)' : Colors.brand.blue, fontSize: 14, fontWeight: '700' }]}>
                ~{dest.price} PLN
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── KROK 2 — Dates ──────────────────────────────────────────────────────────

export function Step2({ formData, setFormData, currentColors }: StepProps) {
  return (
    <View style={styles.stepContainer}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <View style={{ padding: 8, backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: 12 }}>
          <Ionicons name="calendar" size={24} color={Colors.brand.blue} />
        </View>
        <Text style={[styles.stepTitle, { color: currentColors.text, marginBottom: 0, fontSize: 22, fontWeight: '800' }]}>
          Kiedy wyjeżdżasz?
        </Text>
      </View>
      <Text style={[styles.stepSubtitle, { color: currentColors.subtext, marginBottom: 24 }]}>
        Wybierz dokładne daty wyjazdu i powrotu.
      </Text>

      <DateRangePicker
        departureDate={formData.departureDate}
        returnDate={formData.returnDate}
        onDatesChange={(departure, ret) =>
          setFormData({ ...formData, departureDate: departure, returnDate: ret })
        }
      />

      {/* Nowoczesny blok wskazówki z lewym borderem */}
      <View style={[
        styles.tipBox, 
        { 
          backgroundColor: currentColors.card, 
          borderLeftWidth: 4,
          borderLeftColor: Colors.brand.blue,
          borderTopRightRadius: 12,
          borderBottomRightRadius: 12,
          borderTopLeftRadius: 4,
          borderBottomLeftRadius: 4,
          marginTop: 24, 
          flexDirection: 'row', 
          alignItems: 'center', 
          gap: 12, 
          padding: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 5,
          elevation: 2
        }
      ]}>
        <View style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: 8, borderRadius: 50 }}>
          <Ionicons name="bulb-outline" size={20} color={Colors.brand.blue} />
        </View>
        <Text style={[styles.tipText, { color: currentColors.text, flexShrink: 1, marginTop: 0, fontSize: 13, lineHeight: 18 }]}>
          <Text style={{ fontWeight: '700' }}>Pro tip: </Text>Wyjazdy planowane w środku tygodnia są często nawet o 30% tańsze!
        </Text>
      </View>
    </View>
  );
}

// ─── KROK 3 — Travelers & Budget ─────────────────────────────────────────────

const FriendAvatar = ({ friend }: { friend: FriendProfile }) => {
  const label = `${friend.firstName?.[0] ?? ''}${friend.lastName?.[0] ?? ''}`.toUpperCase() || 'Z';

  if (friend.avatar) {
    return <Image source={{ uri: friend.avatar }} style={[styles.friendAvatar, { width: 40, height: 40, borderRadius: 20 }]} />;
  }

  return (
    <View style={[styles.friendAvatarFallback, { backgroundColor: Colors.brand.blue, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={[styles.friendAvatarText, { color: '#fff', fontWeight: 'bold', fontSize: 16 }]}>{label}</Text>
    </View>
  );
};

export function Step3({ formData, setFormData, currentColors, accessToken }: StepProps) {
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setFriends([]);
      return;
    }
    let isActive = true;
    const loadFriends = async () => {
      setFriendsLoading(true);
      setFriendsError(null);
      try {
        const response = await getMyFriends(accessToken);
        if (isActive) setFriends(response.friends);
      } catch (error) {
        if (isActive) {
          setFriendsError(error instanceof Error ? error.message : 'Nie udało się pobrać znajomych');
          setFriends([]);
        }
      } finally {
        if (isActive) setFriendsLoading(false);
      }
    };
    void loadFriends();
    return () => { isActive = false; };
  }, [accessToken]);

  const toggleFriend = (friendId: string) => {
    const isSelected = formData.selectedFriendIds.includes(friendId);
    const selectedFriendIds = isSelected
      ? formData.selectedFriendIds.filter((id) => id !== friendId)
      : [...formData.selectedFriendIds, friendId];

    setFormData({
      ...formData,
      selectedFriendIds,
      travelers: 1 + selectedFriendIds.length,
    });
  };

  const budgetPerPerson = Math.round(formData.budget / Math.max(formData.travelers, 1));

  return (
    <View style={styles.stepContainer}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <View style={{ padding: 8, backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: 12 }}>
          <Ionicons name="wallet" size={24} color={Colors.brand.blue} />
        </View>
        <Text style={[styles.stepTitle, { color: currentColors.text, marginBottom: 0, fontSize: 22, fontWeight: '800' }]}>
          Towarzystwo i budżet
        </Text>
      </View>

      <Text style={[styles.label, { color: currentColors.text, marginTop: 24, fontSize: 16, fontWeight: '700' }]}>Z kim jedziesz?</Text>
      <Text style={[styles.stepSubtitle, { color: currentColors.subtext, marginBottom: 16 }]}>
        Ty + {formData.selectedFriendIds.length} {formData.selectedFriendIds.length === 1 ? 'znajomy' : 'znajomych'} ({formData.travelers} {formData.travelers === 1 ? 'osoba' : 'osób'})
      </Text>

      <View style={[styles.friendsListCard, { backgroundColor: currentColors.card, borderRadius: 16, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }]}>
        {!accessToken ? (
          <Text style={[styles.friendsEmptyText, { color: currentColors.subtext, padding: 16, textAlign: 'center' }]}>Zaloguj się, aby wybrać znajomych do wspólnej wycieczki.</Text>
        ) : friendsLoading ? (
          <View style={[styles.friendsLoader, { padding: 20 }]}><ActivityIndicator size="small" color={Colors.brand.blue} /></View>
        ) : friendsError ? (
          <Text style={[styles.friendsEmptyText, { color: currentColors.subtext, padding: 16, textAlign: 'center' }]}>{friendsError}</Text>
        ) : friends.length === 0 ? (
          <Text style={[styles.friendsEmptyText, { color: currentColors.subtext, padding: 16, textAlign: 'center' }]}>Nie masz jeszcze znajomych. Możesz dodać ich w profilu.</Text>
        ) : (
          friends.map((friend) => {
            const isSelected = formData.selectedFriendIds.includes(friend.id);
            const fullName = `${friend.firstName || ''} ${friend.lastName || ''}`.trim() || friend.displayName;

            return (
              <TouchableOpacity
                key={friend.id}
                style={[
                  styles.friendRow, 
                  { 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    padding: 12, 
                    borderRadius: 12,
                    backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                    marginBottom: 4
                  }
                ]}
                onPress={() => toggleFriend(friend.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.friendCheckbox,
                    {
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: isSelected ? Colors.brand.blue : currentColors.border,
                      backgroundColor: isSelected ? Colors.brand.blue : 'transparent',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12
                    },
                  ]}
                >
                  {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <FriendAvatar friend={friend} />
                <Text style={[styles.friendName, { color: currentColors.text, fontSize: 16, fontWeight: isSelected ? '700' : '500', marginLeft: 12 }]} numberOfLines={1}>
                  {fullName}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <Text style={[styles.label, { color: currentColors.text, marginTop: 32, fontSize: 16, fontWeight: '700' }]}>Deklarowany budżet</Text>

      <View style={[styles.budgetCard, { backgroundColor: currentColors.card, borderRadius: 16, padding: 20, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 }]}>
        <View style={[styles.budgetHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }]}>
          <Text style={[styles.budgetLabel, { color: currentColors.subtext, fontSize: 14 }]}>Kwota łączna</Text>
          <Text style={[styles.budgetValue, { color: Colors.brand.blue, fontSize: 28, fontWeight: '800' }]}>{formData.budget.toLocaleString()} PLN</Text>
        </View>

        <CustomSlider
          value={formData.budget}
          onValueChange={(value) => setFormData({ ...formData, budget: value })}
          min={500}
          max={20000}
          step={100}
        />

        <View style={[styles.budgetRange, { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }]}>
          <Text style={[styles.rangeText, { color: currentColors.subtext, fontSize: 12, fontWeight: '600' }]}>500 PLN</Text>
          <Text style={[styles.rangeText, { color: currentColors.subtext, fontSize: 12, fontWeight: '600' }]}>20 000 PLN</Text>
        </View>

        <View style={{ height: 1, backgroundColor: currentColors.border, marginVertical: 16 }} />

        <Text style={[styles.budgetPerPerson, { color: currentColors.subtext, textAlign: 'center', fontSize: 14, fontWeight: '500' }]}>
          Wychodzi <Text style={{ color: currentColors.text, fontWeight: '700' }}>≈ {budgetPerPerson.toLocaleString()} PLN</Text> na osobę
        </Text>
      </View>

      <View style={[styles.budgetPresets, { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 16 }]}>
        {[
          { icon: 'wallet-outline',   title: 'Oszczędny',  sub: '< 1k',   value: 800  },
          { icon: 'bed-outline',      title: 'Komfortowy', sub: '1-3k',   value: 2000 },
          { icon: 'diamond-outline',  title: 'Luksusowy',  sub: '> 3k',   value: 5000 },
        ].map((preset) => {
          const isSelected = formData.budget === preset.value;
          return (
            <TouchableOpacity
              key={preset.title}
              style={[
                styles.budgetPreset, 
                { 
                  flex: 1,
                  backgroundColor: isSelected ? Colors.brand.blue : currentColors.card, 
                  borderColor: isSelected ? Colors.brand.blue : currentColors.border, 
                  borderWidth: 1,
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: 'center',
                  shadowColor: isSelected ? Colors.brand.blue : '#000',
                  shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
                  shadowOpacity: isSelected ? 0.3 : 0.05,
                  shadowRadius: isSelected ? 8 : 4,
                  elevation: isSelected ? 5 : 1
                }
              ]}
              onPress={() => setFormData({ ...formData, budget: preset.value })}
            >
              <Ionicons name={preset.icon as any} size={26} color={isSelected ? '#fff' : currentColors.text} style={{ marginBottom: 8 }} />
              <Text style={[styles.budgetPresetTitle, { color: isSelected ? '#fff' : currentColors.text, fontSize: 13, fontWeight: '700', marginBottom: 2 }]}>{preset.title}</Text>
              <Text style={[styles.budgetPresetSubtitle, { color: isSelected ? 'rgba(255,255,255,0.8)' : currentColors.subtext, fontSize: 11 }]}>{preset.sub}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── KROK 4 — Preferences ────────────────────────────────────────────────────

export function Step4({ formData, setFormData, currentColors }: StepProps) {
  const toggleInterest = (id: string) => {
    const updated = formData.interests.includes(id)
      ? formData.interests.filter((i) => i !== id)
      : [...formData.interests, id];
    setFormData({ ...formData, interests: updated });
  };

  const toggleTransport = (id: string) => {
    const updated = formData.transport.includes(id)
      ? formData.transport.filter((t) => t !== id)
      : [...formData.transport, id];
    setFormData({ ...formData, transport: updated });
  };

  return (
    <View style={styles.stepContainer}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <View style={{ padding: 8, backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: 12 }}>
          <Ionicons name="heart" size={24} color={Colors.brand.blue} />
        </View>
        <Text style={[styles.stepTitle, { color: currentColors.text, marginBottom: 0, fontSize: 22, fontWeight: '800' }]}>
          Twoje preferencje
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 16, fontSize: 16, fontWeight: '700' }]}>Co wolisz robić na miejscu?</Text>

      <View style={[styles.interestsGrid, { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }]}>
        {INTERESTS.map((interest) => {
          const isSelected = formData.interests.includes(interest.id);
          return (
            <TouchableOpacity
              key={interest.id}
              style={[
                styles.interestChip,
                {
                  backgroundColor: isSelected ? Colors.brand.blue : currentColors.card,
                  borderColor: isSelected ? Colors.brand.blue : currentColors.border,
                  borderWidth: 1,
                  borderRadius: 100, // Styl "Pill"
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  shadowColor: isSelected ? Colors.brand.blue : '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isSelected ? 0.3 : 0.05,
                  shadowRadius: isSelected ? 6 : 2,
                  elevation: isSelected ? 4 : 1
                },
              ]}
              onPress={() => toggleInterest(interest.id)}
            >
              <Ionicons name={interest.icon} size={18} color={isSelected ? '#fff' : currentColors.subtext} />
              <Text style={[styles.interestChipText, { color: isSelected ? '#fff' : currentColors.text, marginTop: 0, fontSize: 14, fontWeight: '600' }]}>
                {interest.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 32, fontSize: 16, fontWeight: '700' }]}>Jak najchętniej się przemieszczasz?</Text>

      <View style={[styles.transportGrid, { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }]}>
        {TRANSPORT_OPTIONS.map((transport) => {
          const isSelected = formData.transport.includes(transport.id);
          return (
            <TouchableOpacity
              key={transport.id}
              style={[
                styles.transportCard,
                {
                  width: '47%', // Dwa w rzędzie
                  backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.05)' : currentColors.card,
                  borderColor: isSelected ? Colors.brand.blue : currentColors.border,
                  borderWidth: 1.5,
                  borderRadius: 16,
                  paddingVertical: 20,
                  alignItems: 'center',
                },
              ]}
              onPress={() => toggleTransport(transport.id)}
            >
              <Ionicons name={transport.icon} size={32} color={isSelected ? Colors.brand.blue : currentColors.subtext} style={{ marginBottom: 8 }} />
              <Text style={[styles.transportLabel, { color: isSelected ? Colors.brand.blue : currentColors.text, fontWeight: '600' }]}>{transport.label}</Text>
              {isSelected && <Ionicons name="checkmark-circle" size={22} color={Colors.brand.blue} style={{ position: 'absolute', top: 10, right: 10 }} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[
        styles.quickPlanBox, 
        { 
          backgroundColor: '#fffbeb', // Jasny żółty/bursztynowy
          borderColor: '#fcd34d', 
          borderWidth: 1,
          borderRadius: 16,
          flexDirection: 'row', 
          alignItems: 'center', 
          padding: 16, 
          gap: 16,
          marginTop: 32,
          shadowColor: '#f59e0b',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 3
        }
      ]}>
        <View style={{ backgroundColor: '#fef3c7', padding: 12, borderRadius: 100 }}>
          <Ionicons name="flash" size={28} color="#d97706" />
        </View>
        <View style={[styles.quickPlanContent, { flexShrink: 1 }]}>
          <Text style={[styles.quickPlanTitle, { color: '#92400e', fontSize: 16, fontWeight: '800', marginBottom: 4 }]}>Opcja Quick Plan</Text>
          <Text style={[styles.quickPlanText, { color: '#b45309', fontSize: 13, lineHeight: 18 }]}>
            AI wybierze najlepsze opcje automatycznie — gotowy, zoptymalizowany plan w zaledwie 3 sekundy!
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── KROK 5 — Intensity ──────────────────────────────────────────────────────

export function Step5({ formData, setFormData, currentColors }: StepProps) {
  const getIntensityIcon = () => {
    if (formData.attractionsPerDay <= 3) return 'cafe-outline'; 
    if (formData.attractionsPerDay <= 5) return 'walk-outline'; 
    return 'flame-outline'; 
  };

  return (
    <View style={styles.stepContainer}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <View style={{ padding: 8, backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: 12 }}>
          <Ionicons name="speedometer" size={24} color={Colors.brand.blue} />
        </View>
        <Text style={[styles.stepTitle, { color: currentColors.text, marginBottom: 0, fontSize: 22, fontWeight: '800' }]}>
          Intensywność planu
        </Text>
      </View>
      <Text style={[styles.stepSubtitle, { color: currentColors.subtext, marginBottom: 24 }]}>
        Ile głównych atrakcji dziennie zakładasz?
      </Text>

      <View style={[
        styles.travelersCard, 
        { 
          backgroundColor: currentColors.card, 
          borderRadius: 20, 
          padding: 24, 
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.05,
          shadowRadius: 15,
          elevation: 4
        }
      ]}>
        <View style={[styles.travelersCounter, { flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 16 }]}>
          <TouchableOpacity
            style={[styles.counterButton, { backgroundColor: currentColors.background, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: currentColors.border }]}
            onPress={() => formData.attractionsPerDay > 2 && setFormData({ ...formData, attractionsPerDay: formData.attractionsPerDay - 1 })}
          >
            <Ionicons name="remove" size={24} color={currentColors.text} />
          </TouchableOpacity>

          <Text style={[styles.travelersCount, { color: Colors.brand.blue, fontSize: 42, fontWeight: '900', width: 60, textAlign: 'center' }]}>
            {formData.attractionsPerDay}
          </Text>

          <TouchableOpacity
            style={[styles.counterButton, { backgroundColor: Colors.brand.blue, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.brand.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 }]}
            onPress={() => formData.attractionsPerDay < 8 && setFormData({ ...formData, attractionsPerDay: formData.attractionsPerDay + 1 })}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.travelersLabel, { color: currentColors.subtext, fontSize: 16, fontWeight: '600', marginBottom: 24 }]}>atrakcji na dzień</Text>

        <CustomSlider
          value={formData.attractionsPerDay}
          onValueChange={(value) => setFormData({ ...formData, attractionsPerDay: value })}
          min={2}
          max={8}
          step={1}
        />

        <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
          <Text style={[styles.rangeText, { color: currentColors.subtext, fontSize: 12, fontWeight: '600' }]}>Spokojnie</Text>
          <Text style={[styles.rangeText, { color: currentColors.subtext, fontSize: 12, fontWeight: '600' }]}>Biegusiem</Text>
        </View>
      </View>

      {/* Dynamiczny box z tipem uzależniony od slidera */}
      <View style={[
        styles.tipBox, 
        { 
          backgroundColor: formData.attractionsPerDay > 5 ? 'rgba(239, 68, 68, 0.05)' : currentColors.card, 
          borderLeftWidth: 4,
          borderLeftColor: formData.attractionsPerDay > 5 ? '#ef4444' : Colors.brand.blue,
          borderTopRightRadius: 12,
          borderBottomRightRadius: 12,
          borderTopLeftRadius: 4,
          borderBottomLeftRadius: 4,
          marginTop: 24, 
          flexDirection: 'row', 
          alignItems: 'center', 
          gap: 16, 
          padding: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 5,
          elevation: 2
        }
      ]}>
        <View style={{ backgroundColor: formData.attractionsPerDay > 5 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)', padding: 12, borderRadius: 50 }}>
          <Ionicons name={getIntensityIcon()} size={24} color={formData.attractionsPerDay > 5 ? '#ef4444' : Colors.brand.blue} />
        </View>
        <Text style={[styles.tipText, { color: currentColors.text, flexShrink: 1, marginTop: 0, fontSize: 13, lineHeight: 18 }]}>
          {formData.attractionsPerDay <= 3
            ? <><Text style={{ fontWeight: '700' }}>Chill mode:</Text> Dużo czasu na kawkę i zdjęcia. Żadnego pośpiechu.</>
            : formData.attractionsPerDay <= 5
            ? <><Text style={{ fontWeight: '700' }}>Złoty środek:</Text> Idealny balans między zwiedzaniem a relaksem.</>
            : <><Text style={{ fontWeight: '700', color: '#ef4444' }}>Hardcore:</Text> Zapnij pasy, bo to będzie bardzo intensywny dzień!</>}
        </Text>
      </View>
    </View>
  );
}
