const { supabaseAuthClient } = require('../configs/supabaseClient');
const {
  getTripsByOwnerId,
  getTripDaysByTripIds,
  getActivitiesByDayIds,
  getFriendRowsByProfileId,
} = require('../repositories/profileInsights.repository');

const parseAccessToken = (req) => {
  const header = req.headers.authorization;

  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }

  return null;
};

const resolveAuthenticatedUser = async (req, res) => {
  const accessToken = parseAccessToken(req);

  if (!accessToken) {
    res.status(401).json({ message: 'Brak access tokena' });
    return null;
  }

  const { data, error } = await supabaseAuthClient.auth.getUser(accessToken);

  if (error || !data?.user?.id) {
    res.status(401).json({ message: 'Niepoprawny lub wygasly access token' });
    return null;
  }

  return data.user;
};

const isPlannedTripStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  return !['finished', 'done', 'completed', 'cancelled', 'canceled', 'archived'].includes(normalized);
};

const formatNumber = (value) => Number(value || 0).toLocaleString('pl-PL');
const formatBudget = (value) => `${formatNumber(Math.round(Number(value || 0)))} zł`;

const calculateStats = async (userId) => {
  const { data: trips, error: tripsError } = await getTripsByOwnerId(userId);

  if (tripsError) {
    return { stats: null, error: tripsError };
  }

  const tripIds = trips.map((trip) => trip.id).filter(Boolean);
  const { data: tripDays, error: tripDaysError } = await getTripDaysByTripIds(tripIds);

  if (tripDaysError) {
    return { stats: null, error: tripDaysError };
  }

  const dayIds = tripDays.map((day) => day.id).filter(Boolean);
  const { data: activities, error: activitiesError } = await getActivitiesByDayIds(dayIds);

  if (activitiesError) {
    return { stats: null, error: activitiesError };
  }

  const { data: friendRows, error: friendsError } = await getFriendRowsByProfileId(userId);

  if (friendsError) {
    return { stats: null, error: friendsError };
  }

  const uniqueFriendIds = new Set(friendRows.map((row) => row.friendProfile_id).filter(Boolean));
  const totalBudget = trips.reduce((sum, trip) => {
    const value = Number(trip.total_budget || 0);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);

  return {
    stats: {
      tripsCount: trips.length,
      friendsCount: uniqueFriendIds.size,
      tripDaysCount: tripDays.length,
      activitiesCount: activities.length,
      plannedTripsCount: trips.filter((trip) => isPlannedTripStatus(trip.status)).length,
      totalBudget,
    },
    error: null,
  };
};

const buildAchievement = ({ id, title, description, icon, level, progress, target, progressLabel }) => ({
  id,
  title,
  description,
  icon,
  level,
  progress,
  target,
  progressLabel,
  isUnlocked: progress >= target,
});

const buildCountAchievement = ({ id, title, description, icon, level, progress, target }) =>
  buildAchievement({
    id,
    title,
    description,
    icon,
    level,
    progress,
    target,
    progressLabel: `${Math.min(progress, target)}/${target}`,
  });

const buildBudgetAchievement = ({ id, title, description, icon, level, progress, target }) =>
  buildAchievement({
    id,
    title,
    description,
    icon,
    level,
    progress,
    target,
    progressLabel: `${formatBudget(Math.min(progress, target))}/${formatBudget(target)}`,
  });

const buildAchievements = (stats) => [
  buildCountAchievement({
    id: 'first-trip',
    title: 'Pierwsza podróż',
    description: 'Utwórz pierwszą podróż w aplikacji.',
    icon: 'flag-outline',
    level: 'bronze',
    progress: stats.tripsCount,
    target: 1,
  }),
  buildCountAchievement({
    id: 'social-traveler',
    title: 'Towarzyski podróżnik',
    description: 'Dodaj co najmniej dwóch znajomych.',
    icon: 'people-outline',
    level: 'bronze',
    progress: stats.friendsCount,
    target: 2,
  }),
  buildCountAchievement({
    id: 'team-builder',
    title: 'Budowniczy ekipy',
    description: 'Zbuduj listę pięciu znajomych.',
    icon: 'people-circle-outline',
    level: 'silver',
    progress: stats.friendsCount,
    target: 5,
  }),
  buildCountAchievement({
    id: 'group-leader',
    title: 'Lider wyjazdów',
    description: 'Zbierz dziesięciu znajomych do wspólnego planowania.',
    icon: 'ribbon-outline',
    level: 'gold',
    progress: stats.friendsCount,
    target: 10,
  }),
  buildCountAchievement({
    id: 'planner',
    title: 'Dobry planer',
    description: 'Dodaj pięć aktywności do planów podróży.',
    icon: 'calendar-outline',
    level: 'bronze',
    progress: stats.activitiesCount,
    target: 5,
  }),
  buildCountAchievement({
    id: 'detailed-planner',
    title: 'Szczegółowy planer',
    description: 'Dodaj dwadzieścia pięć aktywności do swoich planów.',
    icon: 'list-outline',
    level: 'silver',
    progress: stats.activitiesCount,
    target: 25,
  }),
  buildCountAchievement({
    id: 'master-planner',
    title: 'Mistrz planowania',
    description: 'Zaplanuj sześćdziesiąt aktywności.',
    icon: 'star-outline',
    level: 'gold',
    progress: stats.activitiesCount,
    target: 60,
  }),
  buildCountAchievement({
    id: 'week-plan',
    title: 'Tydzień przygód',
    description: 'Zaplanuj łącznie siedem dni wyjazdów.',
    icon: 'map-outline',
    level: 'bronze',
    progress: stats.tripDaysCount,
    target: 7,
  }),
  buildCountAchievement({
    id: 'month-on-road',
    title: 'Miesiąc w trasie',
    description: 'Zaplanuj łącznie trzydzieści dni podróży.',
    icon: 'trail-sign-outline',
    level: 'gold',
    progress: stats.tripDaysCount,
    target: 30,
  }),
  buildCountAchievement({
    id: 'explorer',
    title: 'Odkrywca',
    description: 'Utwórz trzy różne podróże.',
    icon: 'compass-outline',
    level: 'silver',
    progress: stats.tripsCount,
    target: 3,
  }),
  buildCountAchievement({
    id: 'globtrotter',
    title: 'Globtroter',
    description: 'Utwórz dziesięć planów podróży.',
    icon: 'earth-outline',
    level: 'gold',
    progress: stats.tripsCount,
    target: 10,
  }),
  buildCountAchievement({
    id: 'active-organizer',
    title: 'Aktywny organizator',
    description: 'Miej trzy aktywne lub planowane podróże.',
    icon: 'briefcase-outline',
    level: 'silver',
    progress: stats.plannedTripsCount,
    target: 3,
  }),
  buildAchievement({
    id: 'budget-ready',
    title: 'Budżet pod kontrolą',
    description: 'Ustaw budżet w przynajmniej jednej podróży.',
    icon: 'wallet-outline',
    level: 'bronze',
    progress: stats.totalBudget > 0 ? 1 : 0,
    target: 1,
    progressLabel: stats.totalBudget > 0 ? 'Gotowe' : '0/1',
  }),
  buildBudgetAchievement({
    id: 'serious-budget',
    title: 'Poważny plan',
    description: 'Zaplanuj podróże z budżetem łącznie minimum 5000 zł.',
    icon: 'cash-outline',
    level: 'silver',
    progress: stats.totalBudget,
    target: 5000,
  }),
  buildBudgetAchievement({
    id: 'premium-traveler',
    title: 'Wielka wyprawa',
    description: 'Osiągnij łączny budżet podróży na poziomie 20000 zł.',
    icon: 'diamond-outline',
    level: 'diamond',
    progress: stats.totalBudget,
    target: 20000,
  }),
];

const sortAchievements = (achievements) => {
  const levelOrder = {
    bronze: 1,
    silver: 2,
    gold: 3,
    diamond: 4,
  };

  return [...achievements].sort((a, b) => {
    if (a.isUnlocked !== b.isUnlocked) {
      return Number(b.isUnlocked) - Number(a.isUnlocked);
    }

    return (levelOrder[a.level] || 0) - (levelOrder[b.level] || 0);
  });
};

const getMyProfileStats = async (req, res, next) => {
  try {
    const user = await resolveAuthenticatedUser(req, res);

    if (!user) {
      return;
    }

    const { stats, error } = await calculateStats(user.id);

    if (error) {
      return res.status(500).json({ message: 'Nie udalo sie pobrac statystyk profilu' });
    }

    return res.status(200).json({
      message: 'Statystyki profilu pobrane poprawnie.',
      stats,
    });
  } catch (err) {
    return next(err);
  }
};

const getMyProfileAchievements = async (req, res, next) => {
  try {
    const user = await resolveAuthenticatedUser(req, res);

    if (!user) {
      return;
    }

    const { stats, error } = await calculateStats(user.id);

    if (error) {
      return res.status(500).json({ message: 'Nie udalo sie pobrac osiagniec profilu' });
    }

    return res.status(200).json({
      message: 'Osiagniecia profilu pobrane poprawnie.',
      achievements: sortAchievements(buildAchievements(stats)),
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getMyProfileStats,
  getMyProfileAchievements,
};
