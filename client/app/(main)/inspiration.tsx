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
} from '@/types/inspiration';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type SortType = 'recommended' | 'price' | 'duration' | 'date';

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

const SORT_OPTIONS: FilterOption[] = [
  { id: 'recommended', label: 'Polecane', icon: 'sparkles-outline' },
  { id: 'price', label: 'Najtańsze', icon: 'cash-outline' },
  { id: 'duration', label: 'Najkrótsze', icon: 'time-outline' },
  { id: 'date', label: 'Najbliżej', icon: 'calendar-outline' },
];

const getOptionLabel = (options: FilterOption[], id: string) => options.find((option) => option.id === id)?.label ?? '';

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

const getDateTime = (date: string) => {
  const parsed = new Date(`${date}T00:00:00`).getTime();
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
};

const getComparablePrice = (price: number | null) => (price === null ? Number.MAX_SAFE_INTEGER : price);

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
  const [activeBudgetId, setActiveBudgetId] = useState<BudgetLevel | 'all'>('all');
  const [activeDurationId, setActiveDurationId] = useState<DurationType | 'all'>('all');
  const [sortType, setSortType] = useState<SortType>('recommended');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const bottomPadding = 65 + (insets.bottom > 0 ? insets.bottom : 10) + 28;
  const savedCount = savedOfferIds.size;

  const activeFilters = useMemo(() => {
    const source = SOURCE_FILTERS.find((filter) => filter.id === activeSourceId)?.filters ?? {};
    const budget = BUDGET_FILTERS.find((filter) => filter.id === activeBudgetId)?.filters ?? {};
    const duration = DURATION_FILTERS.find((filter) => filter.id === activeDurationId)?.filters ?? {};

    return {
      ...source,
      ...budget,
      ...duration,
    };
  }, [activeBudgetId, activeDurationId, activeSourceId]);

  const activeFilterBadges = useMemo(() => {
    const badges: string[] = [];

    if (activeSourceId !== 'all') {
      badges.push(getOptionLabel(SOURCE_FILTERS, activeSourceId));
    }

    if (activeBudgetId !== 'all') {
      badges.push(getOptionLabel(BUDGET_FILTERS, activeBudgetId));
    }

    if (activeDurationId !== 'all') {
      badges.push(getOptionLabel(DURATION_FILTERS, activeDurationId));
    }

    if (showSavedOnly) {
      badges.push('Ulubione');
    }

    if (sortType !== 'recommended') {
      badges.push(`Sortuj: ${getOptionLabel(SORT_OPTIONS, sortType)}`);
    }

    return badges;
  }, [activeBudgetId, activeDurationId, activeSourceId, showSavedOnly, sortType]);

  const activeFilterCount = activeFilterBadges.length;
  const hasAnyFilter = activeFilterCount > 0 || searchText.trim().length > 0;

  const offersWithSavedFlag = useMemo(
    () => offers.map((offer) => ({ ...offer, isSaved: savedOfferIds.has(offer.id) || offer.isSaved })),
    [offers, savedOfferIds]
  );

  const visibleOffers = useMemo(() => {
    const filteredOffers = showSavedOnly
      ? offersWithSavedFlag.filter((offer) => offer.isSaved)
      : offersWithSavedFlag;

    const sortedOffers = [...filteredOffers];

    if (sortType === 'price') {
      sortedOffers.sort((a, b) => getComparablePrice(a.priceFrom) - getComparablePrice(b.priceFrom));
    }

    if (sortType === 'duration') {
      sortedOffers.sort((a, b) => a.daysCount - b.daysCount);
    }

    if (sortType === 'date') {
      sortedOffers.sort((a, b) => getDateTime(a.startDate) - getDateTime(b.startDate));
    }

    return sortedOffers;
  }, [offersWithSavedFlag, showSavedOnly, sortType]);

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

  const resetFilters = () => {
    setActiveSourceId('all');
    setActiveBudgetId('all');
    setActiveDurationId('all');
    setShowSavedOnly(false);
    setSortType('recommended');
    setSearchText('');
  };

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
      Alert.alert('Logowanie wymagane', 'Zaloguj się, aby utworzyć podróż na podstawie inspiracji.');
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

  const renderFilterButton = () => (
    <View style={styles.filterToolbar}>
      <TouchableOpacity
        activeOpacity={0.88}
        style={[styles.filterButton, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}
        onPress={() => setIsFilterModalVisible(true)}
      >
        <View style={styles.filterButtonIconBox}>
          <Ionicons name="options-outline" size={18} color="#fff" />
        </View>
        <View style={styles.filterButtonTextBox}>
          <Text style={[styles.filterButtonTitle, { color: currentColors.text }]}>Filtry</Text>
          <Text style={[styles.filterButtonSubtitle, { color: currentColors.subtext }]}>Ustawienia wyników</Text>
        </View>
        {activeFilterCount > 0 ? (
          <View style={styles.filterCounter}>
            <Text style={styles.filterCounterText}>{activeFilterCount}</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={currentColors.subtext} />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.88}
        style={[
          styles.favoriteQuickButton,
          {
            backgroundColor: showSavedOnly ? '#FF4D67' : currentColors.card,
            borderColor: showSavedOnly ? '#FF4D67' : currentColors.border,
          },
        ]}
        onPress={() => setShowSavedOnly((current) => !current)}
      >
        <Ionicons name={showSavedOnly ? 'heart' : 'heart-outline'} size={21} color={showSavedOnly ? '#fff' : '#FF4D67'} />
      </TouchableOpacity>
    </View>
  );

  const renderActiveFilters = () => {
    if (activeFilterBadges.length === 0) {
      return null;
    }

    return (
      <View style={styles.activeFiltersWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersScroll}>
          {activeFilterBadges.map((badge) => (
            <View key={badge} style={[styles.activeFilterChip, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.brand.blue} />
              <Text style={[styles.activeFilterText, { color: currentColors.text }]}>{badge}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.clearInlineButton} onPress={resetFilters}>
            <Text style={styles.clearInlineButtonText}>Wyczyść</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  const renderSheetFilterGroup = (
    title: string,
    options: FilterOption[],
    activeId: string,
    onSelect: (id: string) => void
  ) => (
    <View style={styles.sheetGroup}>
      <Text style={[styles.sheetGroupTitle, { color: currentColors.text }]}>{title}</Text>
      <View style={styles.sheetOptionsGrid}>
        {options.map((filter) => {
          const isActive = activeId === filter.id;
          return (
            <TouchableOpacity
              key={filter.id}
              activeOpacity={0.85}
              style={[
                styles.sheetOption,
                {
                  backgroundColor: isActive ? Colors.brand.blue : currentColors.background,
                  borderColor: isActive ? Colors.brand.blue : currentColors.border,
                },
              ]}
              onPress={() => onSelect(filter.id)}
            >
              <Ionicons name={filter.icon} size={16} color={isActive ? '#fff' : currentColors.subtext} />
              <Text style={[styles.sheetOptionText, { color: isActive ? '#fff' : currentColors.text }]}>{filter.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.featuredOverlay} />

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
            <Text style={styles.featuredTitle} numberOfLines={2}>{featuredOffer.destination}</Text>
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
                  <Text style={styles.sourceBadgeText}>{offer.source === 'ai' ? 'AI' : 'Użytkownik'}</Text>
                </View>
                <View style={[styles.typeBadge, { backgroundColor: currentColors.background }]}>
                  <Text style={[styles.typeBadgeText, { color: currentColors.subtext }]}>{offer.durationLabel}</Text>
                </View>
              </View>

              <Text style={[styles.offerTitle, { color: currentColors.text }]} numberOfLines={2}>{offer.destination}</Text>
              <Text style={[styles.offerSubtitle, { color: currentColors.subtext }]} numberOfLines={1}>
                {offer.authorName} · {getStatusLabel(offer.status, offer.source)}
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
            {offer.notes || 'Gotowa propozycja podróży przygotowana jako inspiracja do kolejnego wyjazdu.'}
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
          <Text style={[styles.introTitle, { color: currentColors.text }]} maxFontSizeMultiplier={1.08}>
            Znajdź inspirację na kolejny wyjazd
          </Text>
          <Text style={[styles.introText, { color: currentColors.subtext }]} maxFontSizeMultiplier={1.08}>
            Przeglądaj gotowe pomysły na wyjazdy i zapisuj najlepsze propozycje.
          </Text>
        </View>

        <View style={[styles.searchBox, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
          <Ionicons name="search-outline" size={21} color={currentColors.subtext} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Szukaj kierunku albo opisu"
            placeholderTextColor={currentColors.subtext}
            style={[styles.searchInput, { color: currentColors.text }]}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={21} color={currentColors.subtext} />
            </TouchableOpacity>
          )}
        </View>

        {renderFilterButton()}
        {renderActiveFilters()}
        {renderFeaturedOffer()}

        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleBox}>
            <Text style={[styles.sectionHeading, { color: currentColors.text }]}>Propozycje ofert</Text>
            <Text style={[styles.sectionSubheading, { color: currentColors.subtext }]}>
              {showSavedOnly ? 'Twoje zapisane inspiracje' : 'Dopasowane do wybranych ustawień'}
            </Text>
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
                : 'Zmień filtry albo wpisz inny kierunek w wyszukiwarce.'}
            </Text>
            {hasAnyFilter && (
              <TouchableOpacity style={styles.retryButton} onPress={resetFilters}>
                <Text style={styles.retryButtonText}>Wyczyść filtry</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.offersList}>{visibleOffers.map(renderOfferCard)}</View>
        )}
      </ScrollView>

      <Modal visible={isFilterModalVisible} transparent animationType="slide" onRequestClose={() => setIsFilterModalVisible(false)}>
        <View style={styles.modalWrapper}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsFilterModalVisible(false)} />
          <View style={[styles.filterSheet, { backgroundColor: currentColors.card }]}>
            <View style={styles.modalHandle} />
            <View style={styles.filterSheetHeader}>
              <View>
                <Text style={[styles.filterSheetTitle, { color: currentColors.text }]}>Filtry i sortowanie</Text>
                <Text style={[styles.filterSheetSubtitle, { color: currentColors.subtext }]}>Dopasuj propozycje do swoich planów</Text>
              </View>
              <TouchableOpacity style={[styles.sheetCloseButton, { backgroundColor: currentColors.background }]} onPress={() => setIsFilterModalVisible(false)}>
                <Ionicons name="close" size={20} color={currentColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterSheetContent}>
              {renderSheetFilterGroup(
                'Źródło propozycji',
                SOURCE_FILTERS,
                activeSourceId,
                (id) => setActiveSourceId(id as OfferSource | 'all')
              )}
              {renderSheetFilterGroup(
                'Budżet',
                BUDGET_FILTERS,
                activeBudgetId,
                (id) => setActiveBudgetId(id as BudgetLevel | 'all')
              )}
              {renderSheetFilterGroup(
                'Długość wyjazdu',
                DURATION_FILTERS,
                activeDurationId,
                (id) => setActiveDurationId(id as DurationType | 'all')
              )}
              {renderSheetFilterGroup(
                'Sortowanie',
                SORT_OPTIONS,
                sortType,
                (id) => setSortType(id as SortType)
              )}

              <TouchableOpacity
                activeOpacity={0.88}
                style={[
                  styles.sheetFavoriteRow,
                  {
                    backgroundColor: showSavedOnly ? 'rgba(255,77,103,0.14)' : currentColors.background,
                    borderColor: showSavedOnly ? '#FF4D67' : currentColors.border,
                  },
                ]}
                onPress={() => setShowSavedOnly((current) => !current)}
              >
                <View style={styles.sheetFavoriteTextBox}>
                  <Text style={[styles.sheetFavoriteTitle, { color: currentColors.text }]}>Tylko ulubione</Text>
                  <Text style={[styles.sheetFavoriteSubtitle, { color: currentColors.subtext }]}>Wyświetl zapisane propozycje</Text>
                </View>
                <Ionicons name={showSavedOnly ? 'heart' : 'heart-outline'} size={24} color="#FF4D67" />
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.filterSheetActions}>
              <TouchableOpacity style={[styles.secondarySheetButton, { borderColor: currentColors.border }]} onPress={resetFilters}>
                <Text style={[styles.secondarySheetButtonText, { color: currentColors.text }]}>Wyczyść</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primarySheetButton} onPress={() => setIsFilterModalVisible(false)}>
                <Text style={styles.primarySheetButtonText}>Pokaż wyniki</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
                <View style={styles.modalTitleRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.modalTagsRow}>
                      <View style={[styles.sourceBadge, selectedOffer.source === 'ai' ? styles.aiBadge : styles.userBadge]}>
                        <Ionicons name={selectedOffer.source === 'ai' ? 'hardware-chip-outline' : 'person-outline'} size={11} color="#fff" />
                        <Text style={styles.sourceBadgeText}>{selectedOffer.source === 'ai' ? 'AI' : 'Użytkownik'}</Text>
                      </View>
                      <View style={[styles.typeBadge, { backgroundColor: currentColors.background }]}>
                        <Text style={[styles.typeBadgeText, { color: currentColors.subtext }]}>{selectedOffer.durationLabel}</Text>
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
                    <Ionicons name="calendar-outline" size={18} color={Colors.brand.yellow} />
                    <Text style={[styles.modalStatValue, { color: currentColors.text }]}>{formatDateRange(selectedOffer.startDate, selectedOffer.endDate)}</Text>
                    <Text style={[styles.modalStatLabel, { color: currentColors.subtext }]}>termin</Text>
                  </View>
                  <View style={[styles.modalStat, { backgroundColor: currentColors.background }]}>
                    <Ionicons name="compass-outline" size={18} color={Colors.brand.blue} />
                    <Text style={[styles.modalStatValue, { color: currentColors.text }]}>{selectedOffer.tripTypeLabel}</Text>
                    <Text style={[styles.modalStatLabel, { color: currentColors.subtext }]}>typ wyjazdu</Text>
                  </View>
                </View>

                <Text style={[styles.modalDescription, { color: currentColors.subtext }]}>
                  {selectedOffer.notes || 'To gotowa inspiracja, którą możesz zapisać albo wykorzystać jako podstawę własnego planu podróży.'}
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
                      <Text style={styles.createTripButtonText}>Utwórz plan z inspiracji</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}
