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
}

interface StepProps {
  formData: TripFormData;
  setFormData: (data: TripFormData) => void;
  currentColors: any;
  accessToken?: string | null;
}

// ─── DANE STATYCZNE ───────────────────────────────────────────────────────────

export const POPULAR_DESTINATIONS = [
  { city: 'Paryż',     country: 'FR', price: 1400 },
  { city: 'Rzym',      country: 'IT', price: 1200 },
  { city: 'Barcelona', country: 'ES', price: 990  },
  { city: 'Praga',     country: 'CZ', price: 650  },
  { city: 'Londyn',    country: 'GB', price: 1600 },
  { city: 'Amsterdam', country: 'NL', price: 1100 },
];

export const INTERESTS = [
  { id: 'sightseeing', label: 'Zwiedzanie', icon: '🏛️' },
  { id: 'food',        label: 'Jedzenie',   icon: '🍽️' },
  { id: 'nature',      label: 'Natura',     icon: '🌿' },
  { id: 'parties',     label: 'Imprezy',    icon: '🎉' },
  { id: 'shopping',    label: 'Zakupy',     icon: '🛍️' },
  { id: 'art',         label: 'Sztuka',     icon: '🎨' },
  { id: 'sport',       label: 'Sport',      icon: '⚽' },
  { id: 'beach',       label: 'Plaża',      icon: '🏖️' },
];

export const TRANSPORT_OPTIONS = [
  { id: 'walking', label: 'Pieszo',    icon: '🚶' },
  { id: 'metro',   label: 'Metro/Bus', icon: '🚇' },
  { id: 'car',     label: 'Samochód',  icon: '🚗' },
  { id: 'bike',    label: 'Rower',     icon: '🚲' },
];

// ─── CUSTOM SLIDER ────────────────────────────────────────────────────────────

interface CustomSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
}

export function CustomSlider({ value, onValueChange, min, max, step }: CustomSliderProps) {
  const sliderRef = useRef<View>(null);
  const [sliderPosition, setSliderPosition] = useState(0);
  const [sliderWidth] = useState(300);
  const thumbSize = 24;

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
      style={styles.sliderContainer}
      onLayout={(event) => setSliderPosition(event.nativeEvent.layout.x)}
    >
      <View ref={sliderRef} style={styles.sliderTrack} {...panResponder.panHandlers}>
        <View style={[styles.sliderFill, { width: thumbPosition }]} />
        <View style={[styles.sliderThumb, { left: thumbPosition - thumbSize / 2 }]} />
      </View>
    </View>
  );
}

// ─── KROK 1 — Destination ────────────────────────────────────────────────────

export function Step1({ formData, setFormData, currentColors }: StepProps) {
  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: currentColors.text }]}>
        Dokąd chcesz pojechać? 🌍
      </Text>
      <Text style={[styles.stepSubtitle, { color: currentColors.subtext }]}>
        Wpisz miasto lub kraj docelowy
      </Text>

      <View style={[styles.inputContainer, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.input, { color: currentColors.text }]}
          placeholder="np. Paryż, Francja"
          placeholderTextColor={currentColors.subtext}
          value={formData.destination}
          onChangeText={(text) => setFormData({ ...formData, destination: text })}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: currentColors.subtext }]}>POPULARNE KIERUNKI</Text>

      <View style={styles.destinationsGrid}>
        {POPULAR_DESTINATIONS.map((dest) => (
          <TouchableOpacity
            key={dest.city}
            style={[
              styles.destinationCard,
              { backgroundColor: currentColors.card, borderColor: currentColors.border },
              formData.destination === dest.city && { borderColor: '#6366f1', borderWidth: 2 },
            ]}
            onPress={() => setFormData({ ...formData, destination: dest.city })}
          >
            <Text style={styles.destinationCountry}>{dest.country}</Text>
            <Text style={[styles.destinationCity, { color: currentColors.text }]}>{dest.city}</Text>
            <Text style={[styles.destinationPrice, { color: currentColors.subtext }]}>
              ~{dest.price} PLN
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── KROK 2 — Dates ──────────────────────────────────────────────────────────

export function Step2({ formData, setFormData, currentColors }: StepProps) {
  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: currentColors.text }]}>
        Kiedy wyjeżdżasz? 📅
      </Text>
      <Text style={[styles.stepSubtitle, { color: currentColors.subtext }]}>
        Wybierz daty wyjazdu i powrotu
      </Text>

      <DateRangePicker
        departureDate={formData.departureDate}
        returnDate={formData.returnDate}
        onDatesChange={(departure, ret) =>
          setFormData({ ...formData, departureDate: departure, returnDate: ret })
        }
      />

      <View style={[styles.tipBox, { backgroundColor: currentColors.card + '20', borderColor: '#6366f130', marginTop: 16 }]}>
        <Text style={styles.tipIcon}>📅</Text>
        <Text style={[styles.tipText, { color: currentColors.text }]}>
          Wskazówka: Wyjazdy w środku tygodnia są często nawet 30% tańsze!
        </Text>
      </View>
    </View>
  );
}

// ─── KROK 3 — Travelers & Budget ─────────────────────────────────────────────

const FriendAvatar = ({ friend }: { friend: FriendProfile }) => {
  const label = `${friend.firstName?.[0] ?? ''}${friend.lastName?.[0] ?? ''}`.toUpperCase() || 'Z';

  if (friend.avatar) {
    return <Image source={{ uri: friend.avatar }} style={styles.friendAvatar} />;
  }

  return (
    <View style={[styles.friendAvatarFallback, { backgroundColor: Colors.brand.blue }]}>
      <Text style={styles.friendAvatarText}>{label}</Text>
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
        if (isActive) {
          setFriends(response.friends);
        }
      } catch (error) {
        if (isActive) {
          setFriendsError(error instanceof Error ? error.message : 'Nie udało się pobrać znajomych');
          setFriends([]);
        }
      } finally {
        if (isActive) {
          setFriendsLoading(false);
        }
      }
    };

    void loadFriends();

    return () => {
      isActive = false;
    };
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
      <Text style={[styles.stepTitle, { color: currentColors.text }]}>
        Kto jedzie i jaki budżet? 💰
      </Text>

      <Text style={[styles.label, { color: currentColors.text, marginTop: 20 }]}>
        Liczba podróżujących
      </Text>
      <Text style={[styles.stepSubtitle, { color: currentColors.subtext, marginBottom: 12 }]}>
        Ty + {formData.selectedFriendIds.length} {formData.selectedFriendIds.length === 1 ? 'znajomy' : 'znajomych'} ({formData.travelers} {formData.travelers === 1 ? 'osoba' : 'osób'})
      </Text>

      <View style={[styles.friendsListCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
        {!accessToken ? (
          <Text style={[styles.friendsEmptyText, { color: currentColors.subtext }]}>
            Zaloguj się, aby wybrać znajomych do wspólnej wycieczki.
          </Text>
        ) : friendsLoading ? (
          <View style={styles.friendsLoader}>
            <ActivityIndicator size="small" color={Colors.brand.blue} />
          </View>
        ) : friendsError ? (
          <Text style={[styles.friendsEmptyText, { color: currentColors.subtext }]}>{friendsError}</Text>
        ) : friends.length === 0 ? (
          <Text style={[styles.friendsEmptyText, { color: currentColors.subtext }]}>
            Nie masz jeszcze znajomych. Możesz dodać ich w profilu.
          </Text>
        ) : (
          friends.map((friend) => {
            const isSelected = formData.selectedFriendIds.includes(friend.id);
            const fullName = `${friend.firstName || ''} ${friend.lastName || ''}`.trim() || friend.displayName;

            return (
              <TouchableOpacity
                key={friend.id}
                style={[styles.friendRow, { borderBottomColor: currentColors.border }]}
                onPress={() => toggleFriend(friend.id)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.friendCheckbox,
                    {
                      borderColor: isSelected ? '#6366f1' : currentColors.border,
                      backgroundColor: isSelected ? '#6366f1' : 'transparent',
                    },
                  ]}
                >
                  {isSelected ? <Text style={styles.friendCheckboxMark}>✓</Text> : null}
                </View>
                <FriendAvatar friend={friend} />
                <Text style={[styles.friendName, { color: currentColors.text }]} numberOfLines={1}>
                  {fullName}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <Text style={[styles.label, { color: currentColors.text, marginTop: 30 }]}>
        Budżet całkowity
      </Text>

      <View style={[styles.budgetCard, { backgroundColor: currentColors.card }]}>
        <View style={styles.budgetHeader}>
          <Text style={[styles.budgetLabel, { color: currentColors.subtext }]}>Budżet całkowity</Text>
          <Text style={[styles.budgetValue, { color: '#6366f1' }]}>
            {formData.budget.toLocaleString()} PLN
          </Text>
        </View>

        <CustomSlider
          value={formData.budget}
          onValueChange={(value) => setFormData({ ...formData, budget: value })}
          min={500}
          max={20000}
          step={100}
        />

        <View style={styles.budgetRange}>
          <Text style={[styles.rangeText, { color: currentColors.subtext }]}>500 PLN</Text>
          <Text style={[styles.rangeText, { color: currentColors.subtext }]}>20 000 PLN</Text>
        </View>

        <Text style={[styles.budgetPerPerson, { color: currentColors.subtext }]}>
          ≈ {budgetPerPerson.toLocaleString()} PLN na osobę
        </Text>
      </View>

      <View style={styles.budgetPresets}>
        {[
          { icon: '🎒', title: 'Oszczędny',   sub: '< 1000 PLN',  value: 800  },
          { icon: '🏨', title: 'Komfortowy',  sub: '1-3k PLN',    value: 2000 },
          { icon: '💎', title: 'Luksusowy',   sub: '> 3000 PLN',  value: 5000 },
        ].map((preset) => (
          <TouchableOpacity
            key={preset.title}
            style={[styles.budgetPreset, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}
            onPress={() => setFormData({ ...formData, budget: preset.value })}
          >
            <Text style={styles.budgetPresetIcon}>{preset.icon}</Text>
            <Text style={[styles.budgetPresetTitle, { color: currentColors.text }]}>{preset.title}</Text>
            <Text style={[styles.budgetPresetSubtitle, { color: currentColors.subtext }]}>{preset.sub}</Text>
          </TouchableOpacity>
        ))}
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
      <Text style={[styles.stepTitle, { color: currentColors.text }]}>
        Twoje preferencje 🎯
      </Text>

      <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Co Cię interesuje?</Text>

      <View style={styles.interestsGrid}>
        {INTERESTS.map((interest) => {
          const isSelected = formData.interests.includes(interest.id);
          return (
            <TouchableOpacity
              key={interest.id}
              style={[
                styles.interestChip,
                {
                  backgroundColor: isSelected ? '#6366f1' : currentColors.card,
                  borderColor: currentColors.border,
                },
              ]}
              onPress={() => toggleInterest(interest.id)}
            >
              <Text style={styles.interestChipIcon}>{interest.icon}</Text>
              <Text style={[styles.interestChipText, { color: isSelected ? '#fff' : currentColors.text }]}>
                {interest.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 30 }]}>
        Preferowany transport
      </Text>

      <View style={styles.transportGrid}>
        {TRANSPORT_OPTIONS.map((transport) => {
          const isSelected = formData.transport.includes(transport.id);
          return (
            <TouchableOpacity
              key={transport.id}
              style={[
                styles.transportCard,
                {
                  backgroundColor: isSelected ? currentColors.card + '40' : currentColors.card,
                  borderColor: isSelected ? '#6366f1' : currentColors.border,
                },
              ]}
              onPress={() => toggleTransport(transport.id)}
            >
              <Text style={styles.transportIcon}>{transport.icon}</Text>
              <Text style={[styles.transportLabel, { color: currentColors.text }]}>{transport.label}</Text>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.quickPlanBox, { backgroundColor: '#fef3c7', borderColor: '#fbbf24' }]}>
        <Text style={styles.quickPlanIcon}>⚡</Text>
        <View style={styles.quickPlanContent}>
          <Text style={[styles.quickPlanTitle, { color: '#92400e' }]}>Opcja Quick Plan</Text>
          <Text style={[styles.quickPlanText, { color: '#a16207' }]}>
            AI wybierze najlepsze opcje automatycznie — gotowy plan w 3 sekundy!
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── KROK 5 — Intensity ──────────────────────────────────────────────────────

export function Step5({ formData, setFormData, currentColors }: StepProps) {
  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: currentColors.text }]}>
        Intensywność planu 🎯
      </Text>
      <Text style={[styles.stepSubtitle, { color: currentColors.subtext }]}>
        Ile atrakcji chcesz zwiedzić każdego dnia?
      </Text>

      <View style={[styles.travelersCard, { backgroundColor: currentColors.card }]}>
        <View style={styles.travelersCounter}>
          <TouchableOpacity
            style={[styles.counterButton, { backgroundColor: currentColors.border }]}
            onPress={() =>
              formData.attractionsPerDay > 2 &&
              setFormData({ ...formData, attractionsPerDay: formData.attractionsPerDay - 1 })
            }
          >
            <Text style={styles.counterButtonText}>−</Text>
          </TouchableOpacity>

          <Text style={[styles.travelersCount, { color: currentColors.text }]}>
            {formData.attractionsPerDay}
          </Text>

          <TouchableOpacity
            style={[styles.counterButton, { backgroundColor: '#6366f1' }]}
            onPress={() =>
              formData.attractionsPerDay < 8 &&
              setFormData({ ...formData, attractionsPerDay: formData.attractionsPerDay + 1 })
            }
          >
            <Text style={[styles.counterButtonText, { color: '#fff' }]}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.travelersLabel, { color: currentColors.subtext }]}>
          atrakcji dziennie
        </Text>

        <CustomSlider
          value={formData.attractionsPerDay}
          onValueChange={(value) => setFormData({ ...formData, attractionsPerDay: value })}
          min={2}
          max={8}
          step={1}
        />

        <View style={{ marginTop: 8, alignItems: 'center' }}>
          <Text style={[styles.rangeText, { color: currentColors.subtext }]}>2 — spokojnie</Text>
          <Text style={[styles.rangeText, { color: currentColors.subtext, marginTop: 2 }]}>8 — intensywnie</Text>
        </View>
      </View>

      <View style={[styles.tipBox, { backgroundColor: currentColors.card + '20', borderColor: '#6366f130', marginTop: 20 }]}>
        <Text style={styles.tipIcon}>
          {formData.attractionsPerDay <= 3 ? '🧘' : formData.attractionsPerDay <= 5 ? '🚶' : '🏃'}
        </Text>
        <Text style={[styles.tipText, { color: currentColors.text }]}>
          {formData.attractionsPerDay <= 3
            ? 'Spokojne tempo — dużo czasu na każde miejsce, bez pośpiechu.'
            : formData.attractionsPerDay <= 5
            ? 'Umiarkowane tempo — dobry balans między zwiedzaniem a relaksem.'
            : 'Intensywne tempo — maksimum atrakcji, idealne dla zapaleńców podróży.'}
        </Text>
      </View>
    </View>
  );
}
