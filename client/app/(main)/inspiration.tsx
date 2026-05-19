import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import ScreenHeader from '../../components/ScreenHeader';
import { useAuth } from '@/providers/auth.provider';
import { useCurrentUserProfile } from '@/hooks/useCurrentUserProfile';
import { Colors } from '@/styles/colors';
import { styles } from '@/styles/inspiration.styles';
import {
  createTripFromOffer,
  getInspirationOfferDetails,
  getInspirationOffers,
} from '@/services/inspiration.api';
import { getFavoriteOfferIds, saveFavoriteOfferIds } from '@/services/favoriteOffers.storage';
import type {
  BudgetLevel,
  DurationType,
  InspirationOfferDto,
  OfferFilterDto,
  OfferSource,
  TripRegion,
  TripType,
} from '@/types/inspiration';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type FilterOption = {
  id: string;
  label: string;
  icon: IoniconName;
  filters?: OfferFilterDto;
};

const SOURCE_FILTERS: FilterOption[] = [
  { id: 'all', label: 'Wszystkie', icon: 'sparkles-outline', filters: { source: 'all' } },
  { id: 'ai', label: 'AI', icon: 'hardware-chip-outline', filters: { source: 'ai' } },
  { id: 'user', label: 'Użytkownicy', icon: 'people-outline', filters: { source: 'user' } },
];

const TRIP_TYPE_FILTERS: FilterOption[] = [
  { id: 'all', label: 'Każdy typ', icon: 'compass-outline', filters: { tripType: 'all' } },
  { id: 'sea', label: 'Morze', icon: 'water-outline', filters: { tripType: 'sea' } },
  { id: 'mountains', label: 'Góry', icon: 'trail-sign-outline', filters: { tripType: 'mountains' } },
  { id: 'city', label: 'City break', icon: 'business-outline', filters: { tripType: 'city' } },
  { id: 'nature', label: 'Natura', icon: 'leaf-outline', filters: { tripType: 'nature' } },
  { id: 'culture', label: 'Zwiedzanie', icon: 'map-outline', filters: { tripType: 'culture' } },
  { id: 'active', label: 'Aktywnie', icon: 'walk-outline', filters: { tripType: 'active' } },
];

const REGION_FILTERS: FilterOption[] = [
  { id: 'all', label: 'Wszędzie', icon: 'earth-outline', filters: { region: 'all' } },
  { id: 'poland', label: 'Polska', icon: 'flag-outline', filters: { region: 'poland' } },
  { id: 'europe', label: 'Europa', icon: 'airplane-outline', filters: { region: 'europe' } },
  { id: 'asia', label: 'Azja', icon: 'globe-outline', filters: { region: 'asia' } },
  { id: 'africa', label: 'Afryka', icon: 'sunny-outline', filters: { region: 'africa' } },
  { id: 'north_america', label: 'Ameryka Płn.', icon: 'planet-outline', filters: { region: 'north_america' } },
  { id: 'south_america', label: 'Ameryka Płd.', icon: 'planet-outline', filters: { region: 'south_america' } },
  { id: 'world', label: 'Inne', icon: 'planet-outline', filters: { region: 'world' } },
];

const BUDGET_FILTERS: FilterOption[] = [
  { id: 'all', label: 'Dowolny', icon: 'wallet-outline' },
  { id: 'low', label: 'Do 500 PLN', icon: 'cash-outline', filters: { maxBudget: 500 } },
  { id: 'medium', label: 'Do 1000 PLN', icon: 'cash-outline', filters: { maxBudget: 1000 } },
  { id: 'standard', label: 'Do 2000 PLN', icon: 'cash-outline', filters: { maxBudget: 2000 } },
  { id: 'premium', label: 'Premium', icon: 'diamond-outline', filters: { minBudget: 2000 } },
];

const DURATION_FILTERS: FilterOption[] = [
  { id: 'all', label: 'Dowolnie', icon: 'time-outline', filters: { durationType: 'all' } },
  { id: 'short', label: 'Weekend', icon: 'calendar-outline', filters: { durationType: 'short' } },
  { id: 'week', label: 'Do tygodnia', icon: 'calendar-number-outline', filters: { durationType: 'week' } },
  { id: 'long', label: 'Dłużej', icon: 'calendar-clear-outline', filters: { durationType: 'long' } },
];

const formatPrice = (price: number | null) => {
  if (price === null) {
    return 'Budżet do ustalenia';
  }

  return `od ${new Intl.NumberFormat('pl-PL').format(price)} PLN`;
};

const formatDateRange = (startDate: string, endDate: string) => {
  const formatter = new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: 'short' });
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startDate} - ${endDate}`;
  }

  return `${formatter.format(start)} - ${formatter.format(end)}`;
};

const getStatusLabel = (status: string, source: OfferSource) => {
  const safeStatus = status.toLowerCase();

  if (source === 'ai' || safeStatus.includes('ai')) {
    return 'Wygenerowane przez AI';
  }

  if (safeStatus.includes('planned') || safeStatus.includes('plan')) {
    return 'Plan użytkownika';
  }

  if (safeStatus.includes('finished') || safeStatus.includes('done') || safeStatus.includes('end')) {
    return 'Zakończona podróż';
  }

  return status || 'Propozycja';
};

export default function Inspiration() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const { session } = useAuth();
  const { userAvatarUrl, userInitials } = useCurrentUserProfile();

  const [offers, setOffers] = useState<InspirationOfferDto[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<InspirationOfferDto | null>(null);
  const [savedOfferIds, setSavedOfferIds] = useState<Set<string>>(new Set());
  const [activeSourceId, setActiveSourceId] = useState<OfferSource | 'all'>('all');
  const [activeTripTypeId, setActiveTripTypeId] = useState<TripType | 'all'>('all');
  const [activeRegionId, setActiveRegionId] = useState<TripRegion | 'all'>('all');
  const [activeBudgetId, setActiveBudgetId] = useState<BudgetLevel | 'all'>('all');
  const [activeDurationId, setActiveDurationId] = useState<DurationType | 'all'>('all');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const bottomPadding = 65 + (insets.bottom > 0 ? insets.bottom : 10) + 24;
  const savedCount = savedOfferIds.size;

  const activeFilters = useMemo(() => {
    const source = SOURCE_FILTERS.find((filter) => filter.id === activeSourceId)?.filters ?? {};
    const type = TRIP_TYPE_FILTERS.find((filter) => filter.id === activeTripTypeId)?.filters ?? {};
    const region = REGION_FILTERS.find((filter) => filter.id === activeRegionId)?.filters ?? {};
    const budget = BUDGET_FILTERS.find((filter) => filter.id === activeBudgetId)?.filters ?? {};
    const duration = DURATION_FILTERS.find((filter) => filter.id === activeDurationId)?.filters ?? {};

    return {
      ...source,
      ...type,
      ...region,
      ...budget,
      ...duration,
    };
  }, [activeBudgetId, activeDurationId, activeRegionId, activeSourceId, activeTripTypeId]);

  const offersWithSavedFlag = useMemo(
    () => offers.map((offer) => ({ ...offer, isSaved: savedOfferIds.has(offer.id) || offer.isSaved })),
    [offers, savedOfferIds]
  );

  const visibleOffers = useMemo(
    () => (showSavedOnly ? offersWithSavedFlag.filter((offer) => offer.isSaved) : offersWithSavedFlag),
    [offersWithSavedFlag, showSavedOnly]
  );

  const featuredOffer = visibleOffers[0] ?? null;

  const loadOffers = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage(null);
      const response = await getInspirationOffers({
        ...activeFilters,
        searchText,
      });
      setOffers(response.offers);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Nie udało się pobrać inspiracji');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeFilters, searchText]);

  useEffect(() => {
    getFavoriteOfferIds()
      .then((ids) => setSavedOfferIds(new Set(ids)))
      .catch(() => setSavedOfferIds(new Set()));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOffers(false);
    }, 280);

    return () => clearTimeout(timer);
  }, [loadOffers]);

  const handleSelectOffer = async (offer: InspirationOfferDto) => {
    try {
      setSelectedOffer(offer);
      setIsDetailsLoading(true);
      const response = await getInspirationOfferDetails(offer.id);
      setSelectedOffer({ ...response.offer, isSaved: savedOfferIds.has(offer.id) || response.offer.isSaved });
    } catch (error) {
      Alert.alert('Błąd', error instanceof Error ? error.message : 'Nie udało się pobrać szczegółów');
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleToggleSaved = (offerId: string) => {
    setSavedOfferIds((current) => {
      const next = new Set(current);

      if (next.has(offerId)) {
        next.delete(offerId);
      } else {
        next.add(offerId);
      }

      void saveFavoriteOfferIds([...next]);
      return next;
    });
  };

  const handleCreateTripFromOffer = async () => {
    if (!selectedOffer) {
      return;
    }

    if (!session?.access_token) {
      Alert.alert('Logowanie wymagane', 'Zaloguj się, aby utworzyć własną podróż z tej inspiracji.');
      return;
    }

    try {
      setIsCreatingTrip(true);
      await createTripFromOffer(session.access_token, selectedOffer.id);
      Alert.alert('Gotowe', 'Podróż została utworzona na podstawie wybranej inspiracji.');
      setSelectedOffer(null);
    } catch (error) {
      Alert.alert('Błąd', error instanceof Error ? error.message : 'Nie udało się utworzyć podróży');
    } finally {
      setIsCreatingTrip(false);
    }
  };

  const renderFilterGroup = (
    title: string,
    options: FilterOption[],
    activeId: string,
    onSelect: (id: string) => void
  ) => (
    <View style={styles.filterGroup}>
      <Text style={[styles.filterGroupTitle, { color: currentColors.text }]}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
        {options.map((filter) => {
          const isActive = activeId === filter.id;
          return (
            <TouchableOpacity
              key={filter.id}
              activeOpacity={0.85}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? Colors.brand.blue : currentColors.card,
                  borderColor: isActive ? Colors.brand.blue : currentColors.border,
                },
              ]}
              onPress={() => onSelect(filter.id)}
            >
              <Ionicons name={filter.icon} size={16} color={isActive ? '#fff' : currentColors.subtext} />
              <Text style={[styles.filterChipText, { color: isActive ? '#fff' : currentColors.text }]}>{filter.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderFeaturedOffer = () => {
    if (!featuredOffer) {
      return null;
    }

    const isSaved = savedOfferIds.has(featuredOffer.id) || featuredOffer.isSaved;

    return (
      <View style={styles.heroSection}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.featuredCard, { borderColor: currentColors.border, backgroundColor: currentColors.card }]}
          onPress={() => handleSelectOffer(featuredOffer)}
        >
          <Image source={{ uri: featuredOffer.imageUrl }} style={styles.featuredImage} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.88)']} style={styles.featuredOverlay} />

          <View style={styles.featuredBadgesRow}>
            <View style={styles.featuredTopBadge}>
              <Ionicons name={featuredOffer.source === 'ai' ? 'hardware-chip-outline' : 'person-outline'} size={12} color="#fff" />
              <Text style={styles.featuredBadgeText}>{featuredOffer.source === 'ai' ? 'AI' : 'UŻYTKOWNIK'}</Text>
            </View>
            <TouchableOpacity style={styles.featuredHeartButton} onPress={() => handleToggleSaved(featuredOffer.id)}>
              <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={21} color={isSaved ? '#FF4D67' : '#fff'} />
            </TouchableOpacity>
          </View>

          <View style={styles.featuredBottom}>
            <Text style={styles.featuredLabel}>Polecana inspiracja</Text>
            <Text style={styles.featuredTitle} numberOfLines={1}>{featuredOffer.destination}</Text>
            <Text style={styles.featuredSubtitle} numberOfLines={2}>
              {featuredOffer.notes || `Propozycja na ${featuredOffer.daysCount} dni · ${featuredOffer.authorName}`}
            </Text>
            <View style={styles.featuredMetaRow}>
              <View style={styles.priceTag}>
                <Text style={styles.priceText}>{formatPrice(featuredOffer.priceFrom)}</Text>
              </View>
              <View style={styles.dateTag}>
                <Ionicons name="calendar-outline" size={13} color="#fff" />
                <Text style={styles.dateTagText}>{formatDateRange(featuredOffer.startDate, featuredOffer.endDate)}</Text>
              </View>
              <View style={styles.dateTag}>
                <Ionicons name="compass-outline" size={13} color="#fff" />
                <Text style={styles.dateTagText}>{featuredOffer.tripTypeLabel}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderOfferCard = (offer: InspirationOfferDto) => {
    const isSaved = savedOfferIds.has(offer.id) || offer.isSaved;

    return (
      <TouchableOpacity
        key={offer.id}
        activeOpacity={0.9}
        style={[styles.offerCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}
        onPress={() => handleSelectOffer(offer)}
      >
        <Image source={{ uri: offer.imageUrl }} style={styles.offerImage} />
        <View style={styles.offerContent}>
          <View style={styles.offerHeaderRow}>
            <View style={styles.offerTitleBox}>
              <View style={styles.offerTagsRow}>
                <View style={[styles.sourceBadge, offer.source === 'ai' ? styles.aiBadge : styles.userBadge]}>
                  <Ionicons name={offer.source === 'ai' ? 'hardware-chip-outline' : 'person-outline'} size={11} color="#fff" />
                  <Text style={styles.sourceBadgeText}>{offer.source === 'ai' ? 'AI' : 'User'}</Text>
                </View>
                <View style={[styles.typeBadge, { backgroundColor: currentColors.background }]}> 
                  <Text style={[styles.typeBadgeText, { color: currentColors.subtext }]}>{offer.tripTypeLabel}</Text>
                </View>
              </View>

              <Text style={[styles.offerTitle, { color: currentColors.text }]} numberOfLines={1}>{offer.destination}</Text>
              <Text style={[styles.offerSubtitle, { color: currentColors.subtext }]} numberOfLines={1}>
                {offer.regionLabel} · {offer.authorName}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: currentColors.background }]}
              onPress={() => handleToggleSaved(offer.id)}
            >
              <Ionicons
                name={isSaved ? 'heart' : 'heart-outline'}
                size={21}
                color={isSaved ? '#FF4D67' : currentColors.subtext}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.offerDescription, { color: currentColors.subtext }]} numberOfLines={2}>
            {offer.notes || 'Gotowa propozycja podróży utworzona na podstawie istniejących planów w aplikacji.'}
          </Text>

          <View style={styles.offerMetaRow}>
            <View style={[styles.smallMetaPill, { backgroundColor: currentColors.background }]}> 
              <Ionicons name="time-outline" size={13} color={currentColors.subtext} />
              <Text style={[styles.smallMetaText, { color: currentColors.subtext }]}>{offer.daysCount} dni</Text>
            </View>
            <View style={[styles.smallMetaPill, { backgroundColor: currentColors.background }]}> 
              <Ionicons name="cash-outline" size={13} color={currentColors.subtext} />
              <Text style={[styles.smallMetaText, { color: currentColors.subtext }]}>{formatPrice(offer.priceFrom)}</Text>
            </View>
            <View style={[styles.smallMetaPill, { backgroundColor: currentColors.background }]}> 
              <Ionicons name="calendar-outline" size={13} color={currentColors.subtext} />
              <Text style={[styles.smallMetaText, { color: currentColors.subtext }]}>{formatDateRange(offer.startDate, offer.endDate)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const modalOfferIsSaved = selectedOffer ? savedOfferIds.has(selectedOffer.id) || selectedOffer.isSaved : false;

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}> 
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => loadOffers(true)} tintColor={Colors.brand.blue} />
        }
      >
        <ScreenHeader
          variant="inspiration"
          userInitials={userInitials}
          onNotificationPress={() => console.log('Powiadomienia')}
          onProfilePress={() => router.push('/(main)/profile')}
          userAvatarUrl={userAvatarUrl}
        />

        <View style={styles.introSection}>
          <Text style={[styles.introTitle, { color: currentColors.text }]} maxFontSizeMultiplier={1.1}>
            Znajdź inspirację na kolejny wyjazd
          </Text>
          <Text style={[styles.introText, { color: currentColors.subtext }]} maxFontSizeMultiplier={1.1}>
            Przeglądaj pomysły z planów użytkowników i propozycje wygenerowane przez AI.
          </Text>
        </View>

        <View style={[styles.searchBox, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
          <Ionicons name="search-outline" size={21} color={currentColors.subtext} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Szukaj kierunku, kraju albo opisu"
            placeholderTextColor={currentColors.subtext}
            style={[styles.searchInput, { color: currentColors.text }]}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={21} color={currentColors.subtext} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.savedToggleWrapper}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={[
              styles.savedToggle,
              {
                backgroundColor: showSavedOnly ? '#FF4D67' : currentColors.card,
                borderColor: showSavedOnly ? '#FF4D67' : currentColors.border,
              },
            ]}
            onPress={() => setShowSavedOnly((current) => !current)}
          >
            <Ionicons name={showSavedOnly ? 'heart' : 'heart-outline'} size={18} color={showSavedOnly ? '#fff' : '#FF4D67'} />
            <Text style={[styles.savedToggleText, { color: showSavedOnly ? '#fff' : currentColors.text }]}>
              Ulubione {savedCount > 0 ? `(${savedCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {renderFilterGroup('Źródło propozycji', SOURCE_FILTERS, activeSourceId, (id) => setActiveSourceId(id as OfferSource | 'all'))}
        {renderFilterGroup('Typ podróży', TRIP_TYPE_FILTERS, activeTripTypeId, (id) => setActiveTripTypeId(id as TripType | 'all'))}
        {renderFilterGroup('Kierunek', REGION_FILTERS, activeRegionId, (id) => setActiveRegionId(id as TripRegion | 'all'))}
        {renderFilterGroup('Budżet', BUDGET_FILTERS, activeBudgetId, (id) => setActiveBudgetId(id as BudgetLevel | 'all'))}
        {renderFilterGroup('Długość wyjazdu', DURATION_FILTERS, activeDurationId, (id) => setActiveDurationId(id as DurationType | 'all'))}

        {renderFeaturedOffer()}

        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={[styles.sectionHeading, { color: currentColors.text }]}>Propozycje ofert</Text>
            <Text style={[styles.sectionSubheading, { color: currentColors.subtext }]}>Dopasowane do wybranych filtrów</Text>
          </View>
          <Text style={[styles.countText, { color: currentColors.subtext }]}>{visibleOffers.length} wyników</Text>
        </View>

        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={Colors.brand.blue} />
            <Text style={[styles.centerStateText, { color: currentColors.subtext }]}>Ładowanie inspiracji...</Text>
          </View>
        ) : errorMessage ? (
          <View style={[styles.emptyState, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
            <Ionicons name="cloud-offline-outline" size={34} color={currentColors.subtext} />
            <Text style={[styles.emptyTitle, { color: currentColors.text }]}>Nie udało się pobrać danych</Text>
            <Text style={[styles.emptyText, { color: currentColors.subtext }]}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadOffers(false)}>
              <Text style={styles.retryButtonText}>Spróbuj ponownie</Text>
            </TouchableOpacity>
          </View>
        ) : visibleOffers.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
            <Ionicons name={showSavedOnly ? 'heart-outline' : 'compass-outline'} size={34} color={currentColors.subtext} />
            <Text style={[styles.emptyTitle, { color: currentColors.text }]}>
              {showSavedOnly ? 'Brak ulubionych' : 'Brak propozycji'}
            </Text>
            <Text style={[styles.emptyText, { color: currentColors.subtext }]}> 
              {showSavedOnly
                ? 'Kliknij serduszko przy ofercie, żeby zapisać ją na później.'
                : 'W bazie nie ma jeszcze podróży pasujących do wybranych filtrów.'}
            </Text>
          </View>
        ) : (
          <View style={styles.offersList}>{visibleOffers.map(renderOfferCard)}</View>
        )}
      </ScrollView>

      <Modal visible={Boolean(selectedOffer)} transparent animationType="slide" onRequestClose={() => setSelectedOffer(null)}>
        <View style={styles.modalWrapper}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedOffer(null)} />
          {selectedOffer && (
            <View style={[styles.modalCard, { backgroundColor: currentColors.card }]}> 
              <View style={styles.modalHandle} />
              <Image source={{ uri: selectedOffer.imageUrl }} style={styles.modalImage} />
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSelectedOffer(null)}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>

              <View style={styles.modalContent}>
                <View style={styles.modalTitleRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.modalTagsRow}>
                      <View style={[styles.sourceBadge, selectedOffer.source === 'ai' ? styles.aiBadge : styles.userBadge]}>
                        <Ionicons name={selectedOffer.source === 'ai' ? 'hardware-chip-outline' : 'person-outline'} size={11} color="#fff" />
                        <Text style={styles.sourceBadgeText}>{selectedOffer.source === 'ai' ? 'AI' : 'Użytkownik'}</Text>
                      </View>
                      <View style={[styles.typeBadge, { backgroundColor: currentColors.background }]}> 
                        <Text style={[styles.typeBadgeText, { color: currentColors.subtext }]}>{selectedOffer.tripTypeLabel}</Text>
                      </View>
                    </View>
                    <Text style={[styles.modalTitle, { color: currentColors.text }]}>{selectedOffer.destination}</Text>
                    <Text style={[styles.modalAuthor, { color: currentColors.subtext }]}> 
                      {selectedOffer.authorName} · {getStatusLabel(selectedOffer.status, selectedOffer.source)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: currentColors.background }]}
                    onPress={() => handleToggleSaved(selectedOffer.id)}
                  >
                    <Ionicons
                      name={modalOfferIsSaved ? 'heart' : 'heart-outline'}
                      size={22}
                      color={modalOfferIsSaved ? '#FF4D67' : currentColors.subtext}
                    />
                  </TouchableOpacity>
                </View>

                {isDetailsLoading ? (
                  <ActivityIndicator color={Colors.brand.blue} style={{ marginVertical: 18 }} />
                ) : null}

                <View style={styles.modalStatsGrid}>
                  <View style={[styles.modalStat, { backgroundColor: currentColors.background }]}> 
                    <Ionicons name="time-outline" size={18} color={Colors.brand.blue} />
                    <Text style={[styles.modalStatValue, { color: currentColors.text }]}>{selectedOffer.daysCount} dni</Text>
                    <Text style={[styles.modalStatLabel, { color: currentColors.subtext }]}>{selectedOffer.durationLabel}</Text>
                  </View>
                  <View style={[styles.modalStat, { backgroundColor: currentColors.background }]}> 
                    <Ionicons name="cash-outline" size={18} color={Colors.brand.green} />
                    <Text style={[styles.modalStatValue, { color: currentColors.text }]}>{formatPrice(selectedOffer.priceFrom)}</Text>
                    <Text style={[styles.modalStatLabel, { color: currentColors.subtext }]}>{selectedOffer.budgetLabel}</Text>
                  </View>
                </View>

                <View style={styles.modalStatsGrid}>
                  <View style={[styles.modalStat, { backgroundColor: currentColors.background }]}> 
                    <Ionicons name="earth-outline" size={18} color={Colors.brand.yellow} />
                    <Text style={[styles.modalStatValue, { color: currentColors.text }]}>{selectedOffer.regionLabel}</Text>
                    <Text style={[styles.modalStatLabel, { color: currentColors.subtext }]}>kierunek</Text>
                  </View>
                  <View style={[styles.modalStat, { backgroundColor: currentColors.background }]}> 
                    <Ionicons name="calendar-outline" size={18} color={Colors.brand.blue} />
                    <Text style={[styles.modalStatValue, { color: currentColors.text }]}>{formatDateRange(selectedOffer.startDate, selectedOffer.endDate)}</Text>
                    <Text style={[styles.modalStatLabel, { color: currentColors.subtext }]}>termin</Text>
                  </View>
                </View>

                <Text style={[styles.modalDescription, { color: currentColors.subtext }]}> 
                  {selectedOffer.notes || 'Ta propozycja pochodzi z istniejących podróży zapisanych w bazie aplikacji. Możesz potraktować ją jako inspirację i utworzyć na jej podstawie własny plan.'}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.9}
                  disabled={isCreatingTrip}
                  style={[styles.createTripButton, isCreatingTrip && styles.createTripButtonDisabled]}
                  onPress={handleCreateTripFromOffer}
                >
                  {isCreatingTrip ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="add-circle-outline" size={20} color="#fff" />
                      <Text style={styles.createTripButtonText}>Utwórz podróż z tej oferty</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}
