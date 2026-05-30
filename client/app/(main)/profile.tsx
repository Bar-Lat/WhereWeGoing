import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Alert,
  ActivityIndicator,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/styles/colors';
import ScreenHeader from '@/components/ScreenHeader';
import { useAuth } from '@/providers/auth.provider';
import EditProfileModal from '@/components/EditProfileModal';
import { useCurrentUserProfile } from '@/hooks/useCurrentUserProfile';
import { useProfile } from '@/providers/profile.provider';
import {useNetwork} from '@/providers/network.provider'
import { useNotifications } from '@/providers/notifications.provider';
import type { FriendProfile } from '@/types/friends';
import {
  type AchievementLevel,
  type ProfileAchievement,
  type ProfileStats,
  getMyProfileAchievements,
  getMyProfileStats,
} from '@/services/profile.api';
import {
  addFriend,
  getMyFriends,
  removeFriend,
  searchFriendCandidates,
} from '@/services/friends.api';
import { syncUnlockedAchievements } from '@/services/achievementNotifications.storage';
import { getTripHistory, type TripHistoryItem } from '@/services/trip.api';

type AchievementTab = 'unlocked' | 'locked';

const TRIP_CARD_COLORS = [
  '#3D5A80',
  '#5C4D7D',
  '#2A9D8F',
  '#E76F51',
  '#457B9D',
  '#6A4C93',
  '#BC6C25',
  '#2F6B5E',
];

const getTripCardColor = (tripId: string) => {
  let hash = 0;
  for (let i = 0; i < tripId.length; i += 1) {
    hash = tripId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TRIP_CARD_COLORS[Math.abs(hash) % TRIP_CARD_COLORS.length];
};

const formatDayDate = (date: string | null | undefined) => {
  if (!date) {
    return null;
  }

  const isoDate = date.split('T')[0];
  const [year, month, day] = isoDate.split('-');

  if (year && month && day) {
    return `${day}.${month}.${year}`;
  }

  return date;
};

const getInitialsFromName = (name: string, fallback = 'U') => {
  const parts = name.trim().split(' ').filter(Boolean);

  if (parts.length > 0) {
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  return fallback;
};

const getFriendSubtitle = (friend: FriendProfile) => {
  const name = `${friend.firstName || ''} ${friend.lastName || ''}`.trim();
  return name ? 'Znajomy w WhereWeGoing' : 'Profil bez uzupełnionych danych';
};

const getShortProfileCode = (code: string | null | undefined) => {
  if (!code) {
    return 'Brak kodu';
  }

  return `${code.slice(0, 8)}...${code.slice(-4)}`;
};

const formatBudget = (value: number) => `${Math.round(value || 0).toLocaleString('pl-PL')} zł`;

const getAchievementPercent = (achievement: ProfileAchievement) => {
  if (achievement.target <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((achievement.progress / achievement.target) * 100));
};

const getAchievementLevelLabel = (level: AchievementLevel) => {
  switch (level) {
    case 'bronze':
      return 'Brązowe';
    case 'silver':
      return 'Srebrne';
    case 'gold':
      return 'Złote';
    case 'diamond':
      return 'Diamentowe';
    default:
      return 'Osiągnięcie';
  }
};

const getAchievementLevelColor = (level: AchievementLevel) => {
  switch (level) {
    case 'bronze':
      return '#CD7F32';
    case 'silver':
      return '#94A3B8';
    case 'gold':
      return '#F59E0B';
    case 'diamond':
      return '#38BDF8';
    default:
      return Colors.brand.blue;
  }
};

const ProfileAvatar = ({
  uri,
  label,
  size = 46,
  backgroundColor,
}: {
  uri?: string | null;
  label: string;
  size?: number;
  backgroundColor: string;
}) => {
  const initials = getInitialsFromName(label);

  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={[styles.smallAvatarText, { fontSize: Math.max(13, size * 0.34) }]}>{initials}</Text>
    </View>
  );
};

export default function Profile() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ panel?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const { signOut, session } = useAuth();
  const { profile } = useCurrentUserProfile();
  const { isLoading, setProfile } = useProfile();
  const bottomPadding = 65 + (insets.bottom > 0 ? insets.bottom : 10) + 30;

  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const { isOffline, isForceOffline, toggleOffline } = useNetwork();

  const { hasUnreadNotifications } = useNotifications();

  const accessToken = session?.access_token ?? null;

  const router = useRouter();

  // Resetujemy błąd ładowania obrazka, jeśli zmieni się link do awatara
  const navigation = useNavigation<BottomTabNavigationProp<Record<string, object | undefined>>>();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<TripHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [expandedTripIds, setExpandedTripIds] = useState<string[]>([]);
  const [isFriendsPanelVisible, setIsFriendsPanelVisible] = useState(false);
  const [isStatsPanelVisible, setIsStatsPanelVisible] = useState(false);
  const [isAchievementsPanelVisible, setIsAchievementsPanelVisible] = useState(false);
  const [achievementTab, setAchievementTab] = useState<AchievementTab>('unlocked');
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [friendsCount, setFriendsCount] = useState(0);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsRefreshing, setFriendsRefreshing] = useState(false);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [friendSearch, setFriendSearch] = useState('');
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionProfileId, setActionProfileId] = useState<string | null>(null);
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);
  const [achievements, setAchievements] = useState<ProfileAchievement[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [newAchievementNotice, setNewAchievementNotice] = useState<ProfileAchievement | null>(null);


  useEffect(() => {
    if (params.panel === 'friends') {
      setIsFriendsPanelVisible(true);
    }
  }, [params.panel]);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [profile?.avatar]);

  useEffect(() => {
    if (!newAchievementNotice) {
      return;
    }

    const timeout = setTimeout(() => {
      setNewAchievementNotice(null);
    }, 5500);

    return () => clearTimeout(timeout);
  }, [newAchievementNotice]);

  const avatarInitials = useMemo(() => {
    const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();

    if (fullName.length > 0) {
      return getInitialsFromName(fullName);
    }

    const email = profile?.email ?? '';
    return email.slice(0, 2).toUpperCase() || 'U';
  }, [profile?.email, profile?.firstName, profile?.lastName]);

  const userNameLabel = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'Imię Nazwisko';
  const emailLabel = profile?.email || 'Brak adresu e-mail';
  const profileCode = profile?.id ?? null;
  const friendsPreview = useMemo(() => friends.slice(0, 4), [friends]);
  const statsFriendCount = profileStats?.friendsCount ?? friendsCount;
  const friendsCountLabel = statsFriendCount === 1 ? '1 osoba' : `${statsFriendCount} osób`;
  const unlockedAchievements = achievements.filter((achievement) => achievement.isUnlocked);
  const lockedAchievements = achievements.filter((achievement) => !achievement.isUnlocked);
  const visibleAchievements = achievementTab === 'unlocked' ? unlockedAchievements : lockedAchievements;
  const achievementsProgressLabel = `${unlockedAchievements.length}/${achievements.length || 0}`;

  const loadFriends = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (isOffline) {
        setFriendsLoading(false);
        setFriendsRefreshing(false);
        setFriendsError(null);
        return;
      }

      if (!accessToken) {
        setFriends([]);
        setFriendsCount(0);
        return;
      }

      try {
        if (mode === 'refresh') {
          setFriendsRefreshing(true);
        } else {
          setFriendsLoading(true);
        }

        setFriendsError(null);
        const response = await getMyFriends(accessToken);
        setFriends(response.friends);
        setFriendsCount(response.count);
      } catch (error) {
        setFriendsError(error instanceof Error ? error.message : 'Nie udało się pobrać znajomych');
      } finally {
        setFriendsLoading(false);
        setFriendsRefreshing(false);
      }
    },
    [accessToken, isOffline]
  );

  const loadProfileInsights = useCallback(async () => {
    if (isOffline) {
      setInsightsLoading(false);
      setInsightsError(null);
      return;
    }

    if (!accessToken) {
      setProfileStats(null);
      setAchievements([]);
      return;
    }

    try {
      setInsightsLoading(true);
      setInsightsError(null);
      const [statsResponse, achievementsResponse] = await Promise.all([
        getMyProfileStats(accessToken),
        getMyProfileAchievements(accessToken),
      ]);
      const nextAchievements = achievementsResponse.achievements;
      setProfileStats(statsResponse.stats);
      setAchievements(nextAchievements);

      if (profile?.id) {
        const newUnlockedIds = await syncUnlockedAchievements(
          profile.id,
          nextAchievements.filter((achievement) => achievement.isUnlocked).map((achievement) => achievement.id)
        );
        const newestAchievement = nextAchievements.find((achievement) => newUnlockedIds.includes(achievement.id));

        if (newestAchievement) {
          setNewAchievementNotice(newestAchievement);
        }
      }
    } catch (error) {
      setInsightsError(error instanceof Error ? error.message : 'Nie udało się pobrać danych profilu');
    } finally {
      setInsightsLoading(false);
    }
  }, [accessToken, isOffline, profile?.id]);

  useEffect(() => {
    loadFriends();
    loadProfileInsights();
  }, [loadFriends, loadProfileInsights]);

  useEffect(() => {
    if (!isFriendsPanelVisible || !accessToken) {
      return;
    }

    const query = friendSearch.trim();

    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let isActive = true;
    const timeout = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const response = await searchFriendCandidates(accessToken, query);

        if (isActive) {
          setSearchResults(response.results);
        }
      } catch {
        if (isActive) {
          setSearchResults([]);
        }
      } finally {
        if (isActive) {
          setSearchLoading(false);
        }
      }
    }, 350);

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [accessToken, friendSearch, isFriendsPanelVisible]);

  const loadHistory = useCallback(async () => {
    if (isOffline) {
      setHistoryError(null);
      setHistory([]);
      setHistoryLoading(false);
      return;
    }

    if (!accessToken) {
      setHistoryError('Brak dostępu. Zaloguj się ponownie.');
      setHistory([]);
      return;
    }

    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const response = await getTripHistory(accessToken);
      setHistory(response.trips);
    } catch (fetchError) {
      setHistoryError(fetchError instanceof Error ? fetchError.message : 'Błąd podczas pobierania historii.');
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [accessToken, isOffline]);

  useEffect(() => {
    if (isHistoryOpen) {
      void loadHistory();
    }
  }, [isHistoryOpen, loadHistory]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setIsHistoryOpen(false);
      };
    }, [])
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      setIsHistoryOpen(false);
    });

    return unsubscribe;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const handleBackPress = () => {
        if (isHistoryOpen) {
          setIsHistoryOpen(false);
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => subscription.remove();
    }, [isHistoryOpen])
  );

  const toggleHistoryDay = useCallback((tripId: string) => {
    setExpandedTripIds((current) =>
      current.includes(tripId) ? current.filter((id) => id !== tripId) : [...current, tripId]
    );
  }, []);

  useEffect(() => {
    if (isOffline) {
      setIsEditModalVisible(false);
    }
  }, [isOffline]);

  const menuItems = useMemo(() => {
    const items: { label: 'Edytuj profil' | 'Tryb offline' | 'Tryb online' | 'Wyloguj się'; icon: string }[] = [
      { label: 'Edytuj profil', icon: 'person-outline' },
      { label: 'Wyloguj się', icon: 'log-out-outline' },
    ];

    if (isForceOffline) {
      items.splice(1, 0, { label: 'Tryb online', icon: 'cloud-outline' });
    } else if (!isOffline) {
      items.splice(1, 0, { label: 'Tryb offline', icon: 'cloud-offline-outline' });
    }

    return isOffline ? items.filter((item) => item.label !== 'Edytuj profil') : items;
  }, [isForceOffline, isOffline]);

  const openEditProfile = useCallback(() => {
    if (isOffline) {
      Alert.alert('Brak internetu', 'Edycja profilu jest dostępna tylko online.');
      return;
    }

    setIsEditModalVisible(true);
  }, [isOffline]);

  const onMenuItemPress = useCallback(
    (label: typeof menuItems[number]['label']) => {
      if (label === 'Edytuj profil') {
        openEditProfile();
        return;
      }
      if (label === 'Tryb offline' || label === 'Tryb online') {
        toggleOffline();
        return;
      }

      if (label === 'Wyloguj się') {
        signOut('manual');
      }
    },
    [openEditProfile, signOut, toggleOffline]
  );

  const handleAddFriend = useCallback(
    async (friendProfileId: string) => {
      if (!accessToken) {
        return;
      }

      try {
        setActionProfileId(friendProfileId);
        await addFriend(accessToken, friendProfileId);
        setFriendSearch('');
        setSearchResults([]);
        await Promise.all([loadFriends('refresh'), loadProfileInsights()]);
      } catch (error) {
        Alert.alert('Nie udało się dodać znajomego', error instanceof Error ? error.message : 'Spróbuj ponownie.');
      } finally {
        setActionProfileId(null);
      }
    },
    [accessToken, loadFriends, loadProfileInsights]
  );

  const handleRemoveFriend = useCallback(
    (friend: FriendProfile) => {
      if (!accessToken) {
        return;
      }

      Alert.alert(
        'Usunąć znajomego?',
        `${friend.displayName} zniknie z Twojej listy znajomych.`,
        [
          { text: 'Anuluj', style: 'cancel' },
          {
            text: 'Usuń',
            style: 'destructive',
            onPress: async () => {
              try {
                setActionProfileId(friend.id);
                await removeFriend(accessToken, friend.id);
                await Promise.all([loadFriends('refresh'), loadProfileInsights()]);
              } catch (error) {
                Alert.alert('Nie udało się usunąć znajomego', error instanceof Error ? error.message : 'Spróbuj ponownie.');
              } finally {
                setActionProfileId(null);
              }
            },
          },
        ]
      );
    },
    [accessToken, loadFriends, loadProfileInsights]
  );

  const handleShareProfileCode = useCallback(async () => {
    if (!profileCode) {
      return;
    }

    await Share.share({
      message: `Dodaj mnie do znajomych w WhereWeGoing. Mój kod profilu: ${profileCode}`,
    });
  }, [profileCode]);

  const statCards = useMemo(
    () => [
      {
        key: 'trips',
        label: 'Podróże',
        value: String(profileStats?.tripsCount ?? 0),
        icon: 'airplane-outline',
        color: Colors.brand.blue,
      },
      {
        key: 'friends',
        label: 'Znajomi',
        value: String(statsFriendCount),
        icon: 'people-outline',
        color: Colors.brand.green,
      },
      {
        key: 'days',
        label: 'Dni planów',
        value: String(profileStats?.tripDaysCount ?? 0),
        icon: 'calendar-outline',
        color: '#F59E0B',
      },
      {
        key: 'activities',
        label: 'Aktywności',
        value: String(profileStats?.activitiesCount ?? 0),
        icon: 'location-outline',
        color: '#8B5CF6',
      },
      {
        key: 'planned',
        label: 'Aktywne plany',
        value: String(profileStats?.plannedTripsCount ?? 0),
        icon: 'briefcase-outline',
        color: '#EC4899',
      },
      {
        key: 'budget',
        label: 'Budżet',
        value: formatBudget(profileStats?.totalBudget ?? 0),
        icon: 'wallet-outline',
        color: '#0EA5E9',
      },
    ],
    [profileStats, statsFriendCount]
  );

  const renderOfflineUnavailable = (title: string, description: string) => (
    <View style={[styles.emptyStateLarge, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
      <Ionicons name="cloud-offline-outline" size={38} color={currentColors.subtext} />
      <Text style={[styles.emptyStateTitle, { color: currentColors.text }]}>{title}</Text>
      <Text style={[styles.emptyStateText, { color: currentColors.subtext }]}>
        {description}
      </Text>
    </View>
  );

  const renderFriendRow = (friend: FriendProfile, type: 'friend' | 'search') => {
    const isActionLoading = actionProfileId === friend.id;
    const actionLabel = type === 'friend' ? 'Usuń' : 'Dodaj';
    const actionColor = type === 'friend' ? '#EF4444' : Colors.brand.blue;

    return (
      <View key={`${type}-${friend.id}`} style={[styles.friendRow, { borderColor: currentColors.border }]}> 
        <ProfileAvatar
          uri={friend.avatar}
          label={friend.displayName}
          backgroundColor={Colors.brand.blue}
        />
        <View style={styles.friendInfo}>
          <Text style={[styles.friendName, { color: currentColors.text }]} numberOfLines={1}>
            {friend.displayName}
          </Text>
          <Text style={[styles.friendSubtitle, { color: currentColors.subtext }]} numberOfLines={1}>
            {getFriendSubtitle(friend)}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.friendActionButton, { borderColor: actionColor }]}
          onPress={() => (type === 'friend' ? handleRemoveFriend(friend) : handleAddFriend(friend.id))}
          disabled={isActionLoading}
        >
          {isActionLoading ? (
            <ActivityIndicator size="small" color={actionColor} />
          ) : (
            <Text style={[styles.friendActionText, { color: actionColor }]}>{actionLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderAchievement = (achievement: ProfileAchievement) => {
    const percent = getAchievementPercent(achievement);
    const levelColor = getAchievementLevelColor(achievement.level);
    const iconColor = achievement.isUnlocked ? '#FFFFFF' : currentColors.subtext;
    const iconBackground = achievement.isUnlocked ? levelColor : 'rgba(148,163,184,0.16)';

    return (
      <View
        key={achievement.id}
        style={[
          styles.achievementCard,
          { backgroundColor: currentColors.card, borderColor: currentColors.border },
        ]}
      >
        <View style={[styles.achievementIconBox, { backgroundColor: iconBackground }]}> 
          <Ionicons name={achievement.icon as any} size={22} color={iconColor} />
        </View>
        <View style={styles.achievementContent}>
          <View style={styles.achievementTitleRow}>
            <Text style={[styles.achievementTitle, { color: currentColors.text }]} numberOfLines={1}>
              {achievement.title}
            </Text>
            <View style={[styles.levelBadge, { backgroundColor: `${levelColor}22` }]}> 
              <Text style={[styles.levelBadgeText, { color: levelColor }]}>{getAchievementLevelLabel(achievement.level)}</Text>
            </View>
          </View>
          <Text style={[styles.achievementDescription, { color: currentColors.subtext }]} numberOfLines={2}>
            {achievement.description}
          </Text>
          <View style={styles.progressHeader}>
            <Text style={[styles.achievementProgressText, { color: currentColors.subtext }]}>Postęp</Text>
            <Text style={[styles.achievementProgressText, { color: currentColors.subtext }]}> 
              {achievement.progressLabel ?? `${Math.min(achievement.progress, achievement.target)}/${achievement.target}`}
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colorScheme === 'dark' ? '#2C3036' : '#E9ECEF' }]}> 
            <View
              style={[
                styles.progressFill,
                {
                  width: `${percent}%`,
                  backgroundColor: achievement.isUnlocked ? levelColor : Colors.brand.blue,
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  };

  const renderPanelHeader = (title: string, subtitle: string, onClose: () => void) => (
    <View style={[styles.modalHeader, { paddingTop: insets.top + 14, borderBottomColor: currentColors.border }]}> 
      <View style={styles.modalTitleBox}>
        <Text style={[styles.modalTitle, { color: currentColors.text }]}>{title}</Text>
        <Text style={[styles.modalSubtitle, { color: currentColors.subtext }]}>{subtitle}</Text>
      </View>
      <TouchableOpacity
        style={[styles.closeButton, { backgroundColor: currentColors.card }]}
        onPress={onClose}
      >
        <Ionicons name="close" size={24} color={currentColors.text} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      
      {isHistoryOpen ? (
        <>
          <View
            style={[
              styles.historyScreenHeader,
              {
                backgroundColor: currentColors.card,
                borderBottomColor: currentColors.border,
                paddingTop: insets.top + 12,
              },
            ]}
          >
            <Text style={[styles.historyScreenTitle, { color: currentColors.text }]}>Historia wycieczek</Text>
            <TouchableOpacity style={styles.historyCloseButton} onPress={() => setIsHistoryOpen(false)}>
              <Ionicons name="close" size={28} color={currentColors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={[styles.historyScreenContent, { paddingBottom: bottomPadding }]}>
            {isOffline ? (
              renderOfflineUnavailable(
                'Historia wycieczek niedostępna offline',
                'Połącz się z internetem, aby pobrać zakończone podróże i aktywności.'
              )
            ) : historyLoading ? (
              <View style={styles.historyLoader}>
                <ActivityIndicator size="large" color={Colors.brand.blue} />
              </View>
            ) : historyError ? (
              <View style={styles.historyMessage}>
                <Text style={[styles.historyMessageText, { color: currentColors.text }]}>{historyError}</Text>
              </View>
            ) : history.length === 0 ? (
              <View style={styles.historyMessage}>
                <Text style={[styles.historyMessageText, { color: currentColors.text }]}>
                  Brak historii wycieczek do wyświetlenia.
                </Text>
              </View>
            ) : (
              history.map((trip) => {
                const isExpanded = expandedTripIds.includes(trip.id);
                const dateLabel = [trip.startDate, trip.endDate].filter(Boolean).join(' / ');
                const totalLabel = trip.total !== null ? `${trip.total.toLocaleString()} PLN` : '-';

                return (
                  <View key={trip.id} style={[styles.historyCard, { borderColor: currentColors.border }]}>
                    <TouchableOpacity activeOpacity={0.9} onPress={() => toggleHistoryDay(trip.id)}>
                      <View style={[styles.historyCardHero, { backgroundColor: getTripCardColor(trip.id) }]}>
                        <View style={styles.historyCardRow}>
                          <Ionicons
                            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                            size={22}
                            color="#FFFFFF"
                            style={styles.historyArrow}
                          />
                          <View style={styles.historyHeaderText}>
                            <Text style={styles.historyHeroDestination}>{trip.destination}</Text>
                            {dateLabel ? <Text style={styles.historyHeroSubtitle}>{dateLabel}</Text> : null}
                          </View>
                          <Text style={styles.historyHeroTotal}>{totalLabel}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={[styles.historyDetails, { borderTopColor: currentColors.border }]}>
                        {trip.days.length === 0 ? (
                          <Text style={[styles.historyEmptyText, { color: currentColors.subtext }]}>
                            Brak aktywności dla tej wycieczki.
                          </Text>
                        ) : (
                          trip.days.map((day, dayIndex) => {
                            const dayNumber = day.dayNumber ?? dayIndex + 1;
                            const formattedDate = formatDayDate(day.date);
                            const dayLabel = formattedDate
                              ? `Dzień ${dayNumber} - ${formattedDate}`
                              : `Dzień ${dayNumber}`;

                            return (
                              <View key={day.dayId} style={styles.historyDayBlock}>
                                <Text style={[styles.historyDayTitle, { color: currentColors.text }]}>{dayLabel}</Text>
                                {day.activities.map((activity) => (
                                  <View
                                    key={activity.id}
                                    style={[styles.historyActivity, { borderBottomColor: currentColors.border }]}
                                  >
                                    <View style={styles.historyActivityLeft}>
                                      <Text style={[styles.historyActivityName, { color: currentColors.text }]}>
                                        {activity.name}
                                      </Text>
                                      <Text style={[styles.historyActivityMeta, { color: currentColors.subtext }]}>
                                        {activity.duration_minutes !== null ? `${activity.duration_minutes} min` : '-'}
                                      </Text>
                                    </View>
                                    <Text style={[styles.historyActivityCost, { color: currentColors.text }]}>
                                      {activity.cost !== null ? `${activity.cost.toLocaleString()} PLN` : '-'}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            );
                          })
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </>
      ) : (
        <>
      <ScreenHeader
        variant="default"
        title="Mój Profil"
        showProfile={false}
        hasUnreadNotifications={hasUnreadNotifications}
        onNotificationPress={() => router.push('/notifications')}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}> 
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.brand.blue} />
          </View>
        ) : (
          <>
            <View style={styles.profileHeader}>
              <View style={[styles.avatarWrapper, { borderColor: currentColors.border }]}> 
                {profile?.avatar && !avatarLoadError ? (
                  <Image
                    source={{ uri: profile.avatar }}
                    style={styles.avatarImage}
                    onError={() => setAvatarLoadError(true)}
                  />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: Colors.brand.blue }]}> 
                    <Text style={styles.avatarText}>{avatarInitials}</Text>
                  </View>
                )}
                {!isOffline && (
                  <TouchableOpacity 
                    style={[styles.editBadge, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}
                    onPress={() => setIsEditModalVisible(true)}
                  >
                    <Ionicons name="pencil" size={14} color={currentColors.text} />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.userName, { color: currentColors.text }]}>{userNameLabel}</Text>
              <Text style={[styles.userEmail, { color: currentColors.subtext }]}>{emailLabel}</Text>
            </View>

            {newAchievementNotice && (
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.achievementNotice}
                onPress={() => {
                  setIsAchievementsPanelVisible(true);
                  setAchievementTab('unlocked');
                }}
              >
                <View style={styles.noticeIconBox}>
                  <Ionicons name="trophy" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.noticeTextBox}>
                  <Text style={styles.noticeTitle}>Nowe osiągnięcie</Text>
                  <Text style={styles.noticeText} numberOfLines={1}>{newAchievementNotice.title}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.summaryCard, { backgroundColor: currentColors.card, borderColor: currentColors.border, opacity: isOffline ? 0.72 : 1 }]}
              onPress={() => setIsFriendsPanelVisible(true)}
            >
              <View style={styles.summaryCardHeader}>
                <View style={styles.summaryTitleRow}>
                  <View style={[styles.summaryIconBox, { backgroundColor: Colors.brand.blue }]}> 
                    <Ionicons name="people" size={22} color="#FFFFFF" />
                  </View>
                  <View style={styles.summaryTextBox}>
                    <Text style={[styles.summaryTitle, { color: currentColors.text }]}>Moi znajomi</Text>
                    <Text style={[styles.summarySubtitle, { color: currentColors.subtext }]}>
                      {isOffline ? 'Niedostępne w trybie offline' : 'Zarządzaj osobami do wspólnych planów'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={currentColors.subtext} />
              </View>

              <View style={styles.summaryBottomRow}>
                <View style={styles.friendsPreviewStack}>
                  {friendsLoading ? (
                    <ActivityIndicator size="small" color={Colors.brand.blue} />
                  ) : friendsPreview.length > 0 ? (
                    friendsPreview.map((friend, index) => (
                      <View
                        key={friend.id}
                        style={[
                          styles.previewAvatarWrapper,
                          {
                            marginLeft: index === 0 ? 0 : -10,
                            borderColor: currentColors.card,
                          },
                        ]}
                      >
                        <ProfileAvatar
                          uri={friend.avatar}
                          label={friend.displayName}
                          size={34}
                          backgroundColor={Colors.brand.green}
                        />
                      </View>
                    ))
                  ) : (
                    <View style={[styles.emptyPreviewIcon, { borderColor: currentColors.border }]}> 
                      <Ionicons name="person-add-outline" size={18} color={currentColors.subtext} />
                    </View>
                  )}
                </View>
                <Text style={[styles.summaryValue, { color: currentColors.text }]}>{friendsCountLabel}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.summaryCard, { backgroundColor: currentColors.card, borderColor: currentColors.border, opacity: isOffline ? 0.72 : 1 }]}
              onPress={() => setIsStatsPanelVisible(true)}
            >
              <View style={styles.summaryCardHeader}>
                <View style={styles.summaryTitleRow}>
                  <View style={[styles.summaryIconBox, { backgroundColor: Colors.brand.green }]}> 
                    <Ionicons name="bar-chart" size={22} color="#FFFFFF" />
                  </View>
                  <View style={styles.summaryTextBox}>
                    <Text style={[styles.summaryTitle, { color: currentColors.text }]}>Moje statystyki</Text>
                    <Text style={[styles.summarySubtitle, { color: currentColors.subtext }]}>
                      {isOffline ? 'Niedostępne w trybie offline' : 'Podróże, aktywności i budżet w jednym miejscu'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={currentColors.subtext} />
              </View>

              <View style={styles.miniStatsRow}>
                <View style={styles.miniStatItem}>
                  <Text style={[styles.miniStatValue, { color: currentColors.text }]}>{profileStats?.tripsCount ?? 0}</Text>
                  <Text style={[styles.miniStatLabel, { color: currentColors.subtext }]}>podróże</Text>
                </View>
                <View style={styles.miniStatItem}>
                  <Text style={[styles.miniStatValue, { color: currentColors.text }]}>{profileStats?.activitiesCount ?? 0}</Text>
                  <Text style={[styles.miniStatLabel, { color: currentColors.subtext }]}>aktywności</Text>
                </View>
                <View style={styles.miniStatItem}>
                  <Text style={[styles.miniStatValue, { color: currentColors.text }]}>{formatBudget(profileStats?.totalBudget ?? 0)}</Text>
                  <Text style={[styles.miniStatLabel, { color: currentColors.subtext }]}>budżet</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.summaryCard, { backgroundColor: currentColors.card, borderColor: currentColors.border, opacity: isOffline ? 0.72 : 1 }]}
              onPress={() => setIsAchievementsPanelVisible(true)}
            >
              <View style={styles.summaryCardHeader}>
                <View style={styles.summaryTitleRow}>
                  <View style={[styles.summaryIconBox, { backgroundColor: '#F59E0B' }]}> 
                    <Ionicons name="trophy" size={22} color="#FFFFFF" />
                  </View>
                  <View style={styles.summaryTextBox}>
                    <Text style={[styles.summaryTitle, { color: currentColors.text }]}>Osiągnięcia</Text>
                    <Text style={[styles.summarySubtitle, { color: currentColors.subtext }]}>
                      {isOffline ? 'Niedostępne w trybie offline' : 'Odblokowane cele i kolejne wyzwania'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={currentColors.subtext} />
              </View>

              <View style={styles.summaryBottomRow}>
                <View style={styles.achievementPreviewStack}>
                  {unlockedAchievements.slice(0, 4).map((achievement, index) => (
                    <View
                      key={achievement.id}
                      style={[
                        styles.previewAchievementIcon,
                        {
                          marginLeft: index === 0 ? 0 : -8,
                          backgroundColor: getAchievementLevelColor(achievement.level),
                          borderColor: currentColors.card,
                        },
                      ]}
                    >
                      <Ionicons name={achievement.icon as any} size={16} color="#FFFFFF" />
                    </View>
                  ))}
                  {unlockedAchievements.length === 0 && (
                    <View style={[styles.emptyPreviewIcon, { borderColor: currentColors.border }]}> 
                      <Ionicons name="trophy-outline" size={18} color={currentColors.subtext} />
                    </View>
                  )}
                </View>
                <Text style={[styles.summaryValue, { color: currentColors.text }]}>{achievementsProgressLabel}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.summaryCard, { backgroundColor: currentColors.card, borderColor: currentColors.border, opacity: isOffline ? 0.72 : 1 }]}
              onPress={() => setIsHistoryOpen(true)}
            >
              <View style={styles.summaryCardHeader}>
                <View style={styles.summaryTitleRow}>
                  <View style={[styles.summaryIconBox, { backgroundColor: '#6366F1' }]}>
                    <Ionicons name="time" size={22} color="#FFFFFF" />
                  </View>
                  <View style={styles.summaryTextBox}>
                    <Text style={[styles.summaryTitle, { color: currentColors.text }]}>Historia wycieczek</Text>
                    <Text style={[styles.summarySubtitle, { color: currentColors.subtext }]}>
                      {isOffline ? 'Niedostępne w trybie offline' : 'Przeglądaj zakończone podróże i aktywności'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={currentColors.subtext} />
              </View>

              <View style={styles.summaryBottomRow}>
                <Text style={[styles.summaryValue, { color: currentColors.text }]}>
                  {profileStats?.tripsCount ?? 0} podróży
                </Text>
              </View>
            </TouchableOpacity>

            {insightsError && (
              <TouchableOpacity style={styles.inlineError} onPress={loadProfileInsights} activeOpacity={0.85}>
                <Ionicons name="warning-outline" size={18} color="#EF4444" />
                <Text style={styles.inlineErrorText}>Odśwież dane profilu</Text>
              </TouchableOpacity>
            )}

            <View style={[styles.menuContainer, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
              {menuItems.map((item, index) => {
                const isLogout = item.label === 'Wyloguj się';
                const iconColor = isLogout ? '#ff4444' : currentColors.text;

                return (
                  <TouchableOpacity
                    key={item.label}
                    onPress={() => onMenuItemPress(item.label)}
                    style={[
                      styles.menuItem,
                      index !== menuItems.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: currentColors.border,
                      },
                    ]}
                  >
                    <View style={styles.menuItemLeft}>
                      <Ionicons
                        name={item.icon as any}
                        size={22}
                        color={iconColor}
                        style={styles.menuIcon}
                      />
                      <Text style={[styles.menuLabel, { color: iconColor }]}>{item.label}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={currentColors.subtext} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
        </>
      )}

      <Modal
        visible={isFriendsPanelVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsFriendsPanelVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalContainer, { backgroundColor: currentColors.background }]}
        >
          {renderPanelHeader('Moi znajomi', 'Dodawaj osoby do wspólnego planowania', () => setIsFriendsPanelVisible(false))}

          <ScrollView
            contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 28 }]}
            keyboardShouldPersistTaps="handled"
          >
            {isOffline ? (
              renderOfflineUnavailable(
                'Moi znajomi niedostępni offline',
                'Połącz się z internetem, aby wyszukiwać, dodawać i usuwać znajomych.'
              )
            ) : (
              <>
            <View style={[styles.profileCodeCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
              <View style={styles.profileCodeTop}>
                <View style={styles.profileCodeIcon}>
                  <Ionicons name="qr-code-outline" size={22} color="#FFFFFF" />
                </View>
                <View style={styles.profileCodeInfo}>
                  <Text style={[styles.profileCodeTitle, { color: currentColors.text }]}>Twój kod profilu</Text>
                  <Text style={[styles.profileCodeValue, { color: currentColors.subtext }]} numberOfLines={1}>
                    {getShortProfileCode(profileCode)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.shareCodeButton} onPress={handleShareProfileCode}>
                <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
                <Text style={styles.shareCodeText}>Udostępnij</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
              <Ionicons name="search" size={20} color={currentColors.subtext} />
              <TextInput
                value={friendSearch}
                onChangeText={setFriendSearch}
                placeholder="Szukaj po imieniu, nazwisku lub pełnym kodzie"
                placeholderTextColor={currentColors.subtext}
                style={[styles.searchInput, { color: currentColors.text }]}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {friendSearch.length > 0 && (
                <TouchableOpacity onPress={() => setFriendSearch('')}>
                  <Ionicons name="close-circle" size={20} color={currentColors.subtext} />
                </TouchableOpacity>
              )}
            </View>

            {friendSearch.trim().length >= 2 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Wyniki wyszukiwania</Text>
                  {searchLoading && <ActivityIndicator size="small" color={Colors.brand.blue} />}
                </View>
                <View style={[styles.listCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
                  {searchResults.length > 0 ? (
                    searchResults.map((result) => renderFriendRow(result, 'search'))
                  ) : (
                    <View style={styles.emptyStateSmall}>
                      <Ionicons name="search-outline" size={28} color={currentColors.subtext} />
                      <Text style={[styles.emptyStateText, { color: currentColors.subtext }]}>Brak pasujących profili</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Twoi znajomi</Text>
                <TouchableOpacity onPress={() => loadFriends('refresh')} disabled={friendsRefreshing}>
                  {friendsRefreshing ? (
                    <ActivityIndicator size="small" color={Colors.brand.blue} />
                  ) : (
                    <Ionicons name="refresh" size={20} color={Colors.brand.blue} />
                  )}
                </TouchableOpacity>
              </View>

              <View style={[styles.listCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
                {friendsLoading ? (
                  <View style={styles.emptyStateLarge}>
                    <ActivityIndicator size="large" color={Colors.brand.blue} />
                    <Text style={[styles.emptyStateText, { color: currentColors.subtext }]}>Ładowanie znajomych...</Text>
                  </View>
                ) : friendsError ? (
                  <View style={styles.emptyStateLarge}>
                    <Ionicons name="warning-outline" size={34} color="#EF4444" />
                    <Text style={[styles.emptyStateText, { color: currentColors.subtext }]}>{friendsError}</Text>
                  </View>
                ) : friends.length > 0 ? (
                  friends.map((friend) => renderFriendRow(friend, 'friend'))
                ) : (
                  <View style={styles.emptyStateLarge}>
                    <Ionicons name="people-outline" size={38} color={currentColors.subtext} />
                    <Text style={[styles.emptyStateTitle, { color: currentColors.text }]}>Nie masz jeszcze znajomych</Text>
                    <Text style={[styles.emptyStateText, { color: currentColors.subtext }]}>Wyszukaj osobę po imieniu, nazwisku albo pełnym kodzie profilu.</Text>
                  </View>
                )}
              </View>
            </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={isStatsPanelVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsStatsPanelVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: currentColors.background }]}> 
          {renderPanelHeader('Moje statystyki', 'Pełny przegląd Twojej aktywności', () => setIsStatsPanelVisible(false))}
          <ScrollView contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 28 }]}> 
            {isOffline ? (
              renderOfflineUnavailable(
                'Statystyki niedostępne offline',
                'Połącz się z internetem, aby pobrać aktualne podsumowanie podróży, aktywności i budżetu.'
              )
            ) : (
              <>
            <View style={[styles.statsHeroCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
              <View style={styles.statsHeroIcon}>
                <Ionicons name="analytics-outline" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.statsHeroTextBox}>
                <Text style={[styles.statsHeroTitle, { color: currentColors.text }]}>Twoje podróżnicze podsumowanie</Text>
                <Text style={[styles.statsHeroSubtitle, { color: currentColors.subtext }]}>Dane są liczone z utworzonych podróży, dni planu, aktywności i listy znajomych.</Text>
              </View>
            </View>

            {insightsLoading ? (
              <View style={styles.emptyStateLarge}>
                <ActivityIndicator size="large" color={Colors.brand.blue} />
                <Text style={[styles.emptyStateText, { color: currentColors.subtext }]}>Ładowanie statystyk...</Text>
              </View>
            ) : (
              <View style={styles.statsGrid}>
                {statCards.map((stat) => (
                  <View key={stat.key} style={[styles.statCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
                    <View style={[styles.statIconBox, { backgroundColor: stat.color }]}> 
                      <Ionicons name={stat.icon as any} size={20} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.statValue, { color: currentColors.text }]} numberOfLines={1}>{stat.value}</Text>
                    <Text style={[styles.statLabel, { color: currentColors.subtext }]}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.refreshPanelButton} onPress={loadProfileInsights} activeOpacity={0.88}>
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.refreshPanelButtonText}>Odśwież statystyki</Text>
            </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={isAchievementsPanelVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAchievementsPanelVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: currentColors.background }]}> 
          {renderPanelHeader('Osiągnięcia', 'Odblokowane cele i wyzwania na później', () => setIsAchievementsPanelVisible(false))}
          <ScrollView contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 28 }]}> 
            {isOffline ? (
              renderOfflineUnavailable(
                'Osiągnięcia niedostępne offline',
                'Połącz się z internetem, aby zobaczyć aktualny postęp i odblokowane cele.'
              )
            ) : (
              <>
            <View style={[styles.achievementsHeroCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
              <View style={styles.achievementsHeroIcon}>
                <Ionicons name="trophy" size={26} color="#FFFFFF" />
              </View>
              <View style={styles.achievementsHeroTextBox}>
                <Text style={[styles.statsHeroTitle, { color: currentColors.text }]}>Postęp osiągnięć</Text>
                <Text style={[styles.statsHeroSubtitle, { color: currentColors.subtext }]}>Odblokowano {achievementsProgressLabel}. Trudniejsze cele zostaną zdobyte z czasem.</Text>
              </View>
            </View>

            <View style={[styles.tabsContainer, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
              <TouchableOpacity
                style={[styles.tabButton, achievementTab === 'unlocked' && styles.activeTabButton]}
                onPress={() => setAchievementTab('unlocked')}
              >
                <Text style={[styles.tabText, { color: achievementTab === 'unlocked' ? '#FFFFFF' : currentColors.text }]}>Odblokowane</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, achievementTab === 'locked' && styles.activeTabButton]}
                onPress={() => setAchievementTab('locked')}
              >
                <Text style={[styles.tabText, { color: achievementTab === 'locked' ? '#FFFFFF' : currentColors.text }]}>Nieodblokowane</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.achievementsList}>
              {insightsLoading ? (
                <View style={[styles.emptyAchievementsCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
                  <ActivityIndicator size="small" color={Colors.brand.blue} />
                  <Text style={[styles.emptyStateText, { color: currentColors.subtext }]}>Ładowanie osiągnięć...</Text>
                </View>
              ) : visibleAchievements.length > 0 ? (
                visibleAchievements.map(renderAchievement)
              ) : (
                <View style={[styles.emptyAchievementsCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
                  <Ionicons name={achievementTab === 'unlocked' ? 'trophy-outline' : 'lock-closed-outline'} size={28} color={currentColors.subtext} />
                  <Text style={[styles.emptyStateTitle, { color: currentColors.text }]}>
                    {achievementTab === 'unlocked' ? 'Brak odblokowanych osiągnięć' : 'Brak kolejnych wyzwań'}
                  </Text>
                  <Text style={[styles.emptyStateText, { color: currentColors.subtext }]}> 
                    {achievementTab === 'unlocked'
                      ? 'Korzystaj z aplikacji, twórz podróże i dodawaj aktywności.'
                      : 'Wszystkie osiągnięcia z tej listy są już odblokowane.'}
                  </Text>
                </View>
              )}
            </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      <EditProfileModal
        visible={isEditModalVisible}
        accessToken={accessToken}
        initialProfile={profile}
        onClose={() => setIsEditModalVisible(false)}
        onProfileUpdated={(updatedProfile) => {
          setProfile(updatedProfile);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  loaderContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  avatarWrapper: {
    alignItems: 'center',
    marginBottom: 15,
    position: 'relative',
    padding: 4,
    borderWidth: 1,
    borderRadius: 65,
  },
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  avatarFallback: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  smallAvatarText: {
    color: '#fff',
    fontWeight: '900',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  userName: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    marginBottom: 2,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
    textAlign: 'center',
  },
  achievementNotice: {
    borderRadius: 22,
    padding: 15,
    marginBottom: 16,
    backgroundColor: Colors.brand.green,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noticeIconBox: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noticeTextBox: {
    flex: 1,
    minWidth: 0,
  },
  noticeTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  noticeText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
  },
  summaryCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  summaryIconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTextBox: {
    flex: 1,
    minWidth: 0,
  },
  summaryTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  summaryBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  summaryValue: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  friendsPreviewStack: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 38,
  },
  previewAvatarWrapper: {
    borderWidth: 2,
    borderRadius: 19,
  },
  emptyPreviewIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 18,
  },
  miniStatItem: {
    flex: 1,
    minWidth: 0,
  },
  miniStatValue: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  miniStatLabel: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
    fontWeight: '700',
  },
  achievementPreviewStack: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 38,
  },
  previewAchievementIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineError: {
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(239,68,68,0.1)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  inlineErrorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
  },
  menuContainer: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    marginRight: 14,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  modalTitleBox: {
    flex: 1,
    paddingRight: 10,
  },
  modalTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  profileCodeCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 14,
  },
  profileCodeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileCodeIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: Colors.brand.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCodeInfo: {
    flex: 1,
  },
  profileCodeTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
    marginBottom: 4,
  },
  profileCodeValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  shareCodeButton: {
    height: 46,
    borderRadius: 16,
    backgroundColor: Colors.brand.blue,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  shareCodeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  searchBox: {
    borderWidth: 1,
    borderRadius: 18,
    minHeight: 54,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 22,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 12,
  },
  sectionBlock: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '900',
  },
  listCard: {
    borderWidth: 1,
    borderRadius: 22,
    overflow: 'hidden',
  },
  friendRow: {
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  friendInfo: {
    flex: 1,
    minWidth: 0,
  },
  friendName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  friendSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  friendActionButton: {
    minWidth: 74,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  friendActionText: {
    fontSize: 13,
    fontWeight: '900',
  },
  statsHeroCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  statsHeroIcon: {
    width: 54,
    height: 54,
    borderRadius: 19,
    backgroundColor: Colors.brand.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsHeroTextBox: {
    flex: 1,
    minWidth: 0,
  },
  statsHeroTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
    marginBottom: 4,
  },
  statsHeroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  statIconBox: {
    width: 42,
    height: 42,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  statValue: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  refreshPanelButton: {
    height: 50,
    borderRadius: 18,
    backgroundColor: Colors.brand.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  refreshPanelButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  achievementsHeroCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  achievementsHeroIcon: {
    width: 54,
    height: 54,
    borderRadius: 19,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementsHeroTextBox: {
    flex: 1,
    minWidth: 0,
  },
  tabsContainer: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 4,
    flexDirection: 'row',
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: Colors.brand.blue,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '900',
  },
  achievementsList: {
    gap: 12,
  },
  achievementCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  achievementIconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementContent: {
    flex: 1,
    minWidth: 0,
  },
  achievementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 5,
  },
  achievementTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  levelBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  levelBadgeText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
  },
  achievementDescription: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  achievementProgressText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  progressBar: {
    height: 7,
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
  },
  emptyAchievementsCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyStateSmall: {
    paddingVertical: 28,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 8,
  },
  emptyStateLarge: {
    paddingVertical: 34,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  historyScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  historyScreenTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  historyCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyScreenContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  historyLoader: { padding: 24, alignItems: 'center' },
  historyMessage: { padding: 20, alignItems: 'center' },
  historyMessageText: { textAlign: 'center', fontSize: 15, lineHeight: 22 },
  historyCard: { borderWidth: 1, borderRadius: 20, overflow: 'hidden', marginBottom: 18 },
  historyCardHero: { width: '100%', padding: 16 },
  historyCardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  historyArrow: { marginTop: 2, marginRight: 12 },
  historyHeaderText: { flex: 1, paddingRight: 8 },
  historyHeroDestination: { fontSize: 18, fontWeight: '700', marginBottom: 4, color: '#FFFFFF' },
  historyHeroSubtitle: { fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.88)' },
  historyHeroTotal: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  historyDetails: { padding: 16, borderTopWidth: 1 },
  historyEmptyText: { fontSize: 14, lineHeight: 20 },
  historyDayBlock: { marginBottom: 18 },
  historyDayTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  historyActivity: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  historyActivityLeft: { flex: 1, paddingRight: 12 },
  historyActivityName: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  historyActivityMeta: { fontSize: 13 },
  historyActivityCost: { fontSize: 14, fontWeight: '700' },
});
