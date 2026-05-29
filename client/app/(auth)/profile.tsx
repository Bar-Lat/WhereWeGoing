import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/styles/colors';
import ScreenHeader from '@/components/ScreenHeader';
import { useAuth } from '@/providers/auth.provider';
import EditProfileModal from '@/components/EditProfileModal';
import { useCurrentUserProfile } from '@/hooks/useCurrentUserProfile';
import { useProfile } from '@/providers/profile.provider';
import type { FriendProfile } from '@/types/friends';
import {
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
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const { signOut, session } = useAuth();
  const { profile } = useCurrentUserProfile();
  const { isLoading, setProfile } = useProfile();
  const bottomPadding = 65 + (insets.bottom > 0 ? insets.bottom : 10) + 30;

  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isFriendsPanelVisible, setIsFriendsPanelVisible] = useState(false);
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

  const accessToken = session?.access_token ?? null;

  useEffect(() => {
    setAvatarLoadError(false);
  }, [profile?.avatar]);

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
  const unlockedAchievements = achievements.filter((achievement) => achievement.isUnlocked).length;

  const loadFriends = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
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
    [accessToken]
  );

  const loadProfileInsights = useCallback(async () => {
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
      setProfileStats(statsResponse.stats);
      setAchievements(achievementsResponse.achievements);
    } catch (error) {
      setInsightsError(error instanceof Error ? error.message : 'Nie udało się pobrać danych profilu');
    } finally {
      setInsightsLoading(false);
    }
  }, [accessToken]);

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

  const menuItems = [
    { label: 'Edytuj profil', icon: 'person-outline' },
    { label: 'Wyloguj się', icon: 'log-out-outline' },
  ] as const;

  const onMenuItemPress = useCallback(
    (label: typeof menuItems[number]['label']) => {
      if (label === 'Edytuj profil') {
        setIsEditModalVisible(true);
        return;
      }

      if (label === 'Wyloguj się') {
        signOut('manual');
      }
    },
    [signOut]
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
    ],
    [profileStats, statsFriendCount]
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
    const iconColor = achievement.isUnlocked ? '#FFFFFF' : currentColors.subtext;
    const iconBackground = achievement.isUnlocked ? Colors.brand.green : 'rgba(148,163,184,0.16)';

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
            <Text style={[styles.achievementProgressText, { color: currentColors.subtext }]}>
              {Math.min(achievement.progress, achievement.target)}/{achievement.target}
            </Text>
          </View>
          <Text style={[styles.achievementDescription, { color: currentColors.subtext }]} numberOfLines={2}>
            {achievement.description}
          </Text>
          <View style={[styles.progressBar, { backgroundColor: colorScheme === 'dark' ? '#2C3036' : '#E9ECEF' }]}> 
            <View
              style={[
                styles.progressFill,
                {
                  width: `${percent}%`,
                  backgroundColor: achievement.isUnlocked ? Colors.brand.green : Colors.brand.blue,
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}> 
      <ScreenHeader
        variant="default"
        title="Mój Profil"
        showProfile={false}
        onNotificationPress={() => {}}
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
                <TouchableOpacity
                  style={[styles.editBadge, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}
                  onPress={() => setIsEditModalVisible(true)}
                >
                  <Ionicons name="pencil" size={14} color={currentColors.text} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.userName, { color: currentColors.text }]}>{userNameLabel}</Text>
              <Text style={[styles.userEmail, { color: currentColors.subtext }]}>{emailLabel}</Text>
            </View>

            <View style={styles.sectionTitleRowMain}>
              <View>
                <Text style={[styles.sectionTitleMain, { color: currentColors.text }]}>Moje statystyki</Text>
                <Text style={[styles.sectionSubtitleMain, { color: currentColors.subtext }]}>Krótki podgląd aktywności w aplikacji</Text>
              </View>
              {insightsLoading && <ActivityIndicator size="small" color={Colors.brand.blue} />}
            </View>

            <View style={styles.statsGrid}>
              {statCards.map((stat) => (
                <View key={stat.key} style={[styles.statCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
                  <View style={[styles.statIconBox, { backgroundColor: stat.color }]}> 
                    <Ionicons name={stat.icon as any} size={20} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.statValue, { color: currentColors.text }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: currentColors.subtext }]}>{stat.label}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.budgetCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
              <View style={styles.budgetLeft}>
                <View style={styles.budgetIconBox}>
                  <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.budgetTextBox}>
                  <Text style={[styles.budgetTitle, { color: currentColors.text }]}>Łączny budżet podróży</Text>
                  <Text style={[styles.budgetSubtitle, { color: currentColors.subtext }]}>Suma budżetów z Twoich planów</Text>
                </View>
              </View>
              <Text style={[styles.budgetValue, { color: currentColors.text }]}>{formatBudget(profileStats?.totalBudget ?? 0)}</Text>
            </View>

            {insightsError && (
              <TouchableOpacity style={styles.inlineError} onPress={loadProfileInsights} activeOpacity={0.85}>
                <Ionicons name="warning-outline" size={18} color="#EF4444" />
                <Text style={styles.inlineErrorText}>Odśwież statystyki</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.friendsCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}
              onPress={() => setIsFriendsPanelVisible(true)}
            >
              <View style={styles.friendsCardHeader}>
                <View style={styles.friendsCardTitleRow}>
                  <View style={styles.friendsIconBox}>
                    <Ionicons name="people" size={22} color="#FFFFFF" />
                  </View>
                  <View style={styles.friendsCardTitleText}>
                    <Text style={[styles.friendsCardTitle, { color: currentColors.text }]}>Moi znajomi</Text>
                    <Text style={[styles.friendsCardSubtitle, { color: currentColors.subtext }]}>Zarządzaj osobami do wspólnych planów</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={currentColors.subtext} />
              </View>

              <View style={styles.friendsCardBottom}>
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
                <Text style={[styles.friendsCountText, { color: currentColors.text }]}>{friendsCountLabel}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.sectionTitleRowMain}>
              <View>
                <Text style={[styles.sectionTitleMain, { color: currentColors.text }]}>Osiągnięcia</Text>
                <Text style={[styles.sectionSubtitleMain, { color: currentColors.subtext }]}>Odblokowano {unlockedAchievements}/{achievements.length || 6}</Text>
              </View>
            </View>

            <View style={styles.achievementsList}>
              {achievements.length > 0 ? (
                achievements.map(renderAchievement)
              ) : (
                <View style={[styles.emptyAchievementsCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
                  {insightsLoading ? (
                    <ActivityIndicator size="small" color={Colors.brand.blue} />
                  ) : (
                    <Ionicons name="trophy-outline" size={28} color={currentColors.subtext} />
                  )}
                  <Text style={[styles.emptyStateText, { color: currentColors.subtext }]}>Osiągnięcia pojawią się po załadowaniu danych profilu.</Text>
                </View>
              )}
            </View>

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
          <View style={[styles.modalHeader, { paddingTop: insets.top + 14, borderBottomColor: currentColors.border }]}> 
            <View style={styles.modalTitleBox}>
              <Text style={[styles.modalTitle, { color: currentColors.text }]}>Moi znajomi</Text>
              <Text style={[styles.modalSubtitle, { color: currentColors.subtext }]}>Dodawaj osoby do wspólnego planowania</Text>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: currentColors.card }]}
              onPress={() => setIsFriendsPanelVisible(false)}
            >
              <Ionicons name="close" size={24} color={currentColors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 28 }]}
            keyboardShouldPersistTaps="handled"
          >
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
          </ScrollView>
        </KeyboardAvoidingView>
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
    fontWeight: '800',
    marginBottom: 2,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionTitleRowMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitleMain: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
  },
  sectionSubtitleMain: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    minHeight: 128,
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
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  budgetCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  budgetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  budgetIconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.brand.blue,
  },
  budgetTextBox: {
    flex: 1,
  },
  budgetTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  budgetSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  budgetValue: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    textAlign: 'right',
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
  friendsCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  friendsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  friendsCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  friendsIconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: Colors.brand.blue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendsCardTitleText: {
    flex: 1,
  },
  friendsCardTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    marginBottom: 4,
  },
  friendsCardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  friendsCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
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
  friendsCountText: {
    fontSize: 15,
    fontWeight: '800',
  },
  achievementsList: {
    gap: 12,
    marginBottom: 18,
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
    marginBottom: 3,
  },
  achievementTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  achievementProgressText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  achievementDescription: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 9,
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
    fontWeight: '900',
    marginBottom: 4,
  },
  profileCodeValue: {
    fontSize: 13,
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
});
