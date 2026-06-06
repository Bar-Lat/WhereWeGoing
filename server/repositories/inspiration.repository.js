const { supabaseDbClient } = require('../configs/supabaseClient');
const { createTripDays } = require('./tripDays.repository');
const { createActivities } = require('./activities.repository');
const { addParticipant } = require('./tripParticipants.repository');

const TRIP_COLUMNS = `
  id,
  owner_id,
  destination,
  start_date,
  end_date,
  total_budget,
  status,
  image_url,
  notes,
  created_at,
  updated_at
`;

const normalizeSearchValue = (value) => String(value || '').trim();

const buildOffersQuery = (filters = {}) => {
  let query = supabaseDbClient
    .from('trips')
    .select(TRIP_COLUMNS)
    .order('updated_at', { ascending: false })
    .limit(120);

  if (filters.excludeOwnerId) {
    query = query.neq('owner_id', filters.excludeOwnerId);
  }

  if (Array.isArray(filters.excludeTripIds) && filters.excludeTripIds.length > 0) {
    query = query.not('id', 'in', `(${filters.excludeTripIds.join(',')})`);
  }

  const searchText = normalizeSearchValue(filters.searchText);

  if (searchText) {
    const safeSearchText = searchText.replaceAll('%', '').replaceAll(',', ' ');
    query = query.or(`destination.ilike.%${safeSearchText}%,notes.ilike.%${safeSearchText}%`);
  }

  if (filters.minBudget !== undefined) {
    query = query.gte('total_budget', filters.minBudget);
  }

  if (filters.maxBudget !== undefined) {
    query = query.lte('total_budget', filters.maxBudget);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.startDateFrom) {
    query = query.gte('start_date', filters.startDateFrom);
  }

  if (filters.startDateTo) {
    query = query.lte('start_date', filters.startDateTo);
  }

  if (filters.source === 'ai') {
    query = query.ilike('status', '%ai%');
  }

  if (filters.source === 'user') {
    query = query.not('status', 'ilike', '%ai%');
  }

  return query;
};

const getOffers = async (filters = {}) => {
  const { data, error } = await buildOffersQuery(filters);
  return { data, error };
};

const getOfferById = async (offerId) => {
  const { data, error } = await supabaseDbClient
    .from('trips')
    .select(TRIP_COLUMNS)
    .eq('id', offerId)
    .maybeSingle();

  return { data, error };
};

const getProfilesByIds = async (profileIds) => {
  const uniqueIds = [...new Set(profileIds.filter(Boolean))];

  if (uniqueIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabaseDbClient
    .from('profiles')
    .select('id, first_name, last_name, avatar')
    .in('id', uniqueIds);

  return { data, error };
};

const getOfferSchedule = async (offerId) => {
  const { data: days, error: daysError } = await supabaseDbClient
    .from('trip_days')
    .select('*')
    .eq('trip_id', offerId)
    .order('day_number', { ascending: true });

  if (daysError || !Array.isArray(days) || days.length === 0) {
    return { days: days || [], activitiesByDayId: {}, error: daysError || null };
  }

  const dayIds = days.map((day) => day.id).filter(Boolean);
  const { data: activities, error: activitiesError } = await supabaseDbClient
    .from('activities')
    .select('*')
    .in('day_id', dayIds)
    .order('order_index', { ascending: true });

  if (activitiesError) {
    return { days: [], activitiesByDayId: {}, error: activitiesError };
  }

  const activitiesByDayId = (activities || []).reduce((acc, activity) => {
    if (!acc[activity.day_id]) {
      acc[activity.day_id] = [];
    }
    acc[activity.day_id].push(activity);
    return acc;
  }, {});

  return { days, activitiesByDayId, error: null };
};

const getParticipatingTripIds = async (userId) => {
  if (!userId) {
    return { data: [], error: null };
  }

  const { data, error } = await supabaseDbClient
    .from('trip_participants')
    .select('trip_id')
    .eq('user_id', userId);

  return {
    data: (data || []).map((row) => row.trip_id).filter(Boolean),
    error,
  };
};

const getSummaryFromJsonText = (text) => {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.summary === 'string' && parsed.summary.trim()) {
      return parsed.summary.trim();
    }
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(text.slice(start, end + 1));
        if (typeof parsed?.summary === 'string' && parsed.summary.trim()) {
          return parsed.summary.trim();
        }
      } catch {
        return null;
      }
    }
  }

  return null;
};

const getReadableOfferNotes = (notes, destination) => {
  if (!notes) {
    return `Plan podróży do ${destination}.`;
  }

  const trimmedNotes = String(notes).trim();
  const jsonSummary = getSummaryFromJsonText(trimmedNotes);
  if (jsonSummary) {
    return jsonSummary;
  }

  if (trimmedNotes.startsWith('{') || trimmedNotes.startsWith('[')) {
    return `Plan podróży do ${destination}.`;
  }

  return trimmedNotes;
};

const copyOfferSchedule = async ({ sourceTripId, targetTripId }) => {
  const { days, activitiesByDayId, error } = await getOfferSchedule(sourceTripId);
  if (error || !Array.isArray(days) || days.length === 0) {
    return { error };
  }

  const daysToInsert = days.map((day) => ({
    trip_id: targetTripId,
    day_number: day.day_number,
    date: day.date,
    title: day.title ?? null,
  }));

  const { data: savedDays, error: daysError } = await createTripDays(daysToInsert);
  if (daysError || !Array.isArray(savedDays)) {
    return { error: daysError };
  }

  const activitiesToInsert = [];
  days.forEach((sourceDay, dayIndex) => {
    const savedDay = savedDays[dayIndex];
    if (!savedDay) {
      return;
    }

    (activitiesByDayId[sourceDay.id] || []).forEach((activity) => {
      activitiesToInsert.push({
        day_id: savedDay.id,
        time: activity.time,
        name: activity.name ?? null,
        type: activity.type ?? 'inne',
        description: activity.description ?? null,
        location: activity.location ?? null,
        coordinates: activity.coordinates ?? null,
        cost: activity.cost ?? null,
        duration_minutes: activity.duration_minutes ?? null,
        order_index: activity.order_index ?? 0,
      });
    });
  });

  if (activitiesToInsert.length > 0) {
    const { error: activitiesError } = await createActivities(activitiesToInsert);
    if (activitiesError) {
      return { error: activitiesError };
    }
  }

  return { error: null };
};

const createTripFromOffer = async ({ ownerId, offer }) => {
  const now = new Date().toISOString();
  const notes = getReadableOfferNotes(offer.notes, offer.destination);

  const { data, error } = await supabaseDbClient
    .from('trips')
    .insert({
      owner_id: ownerId,
      destination: offer.destination,
      start_date: offer.start_date,
      end_date: offer.end_date,
      total_budget: offer.total_budget,
      status: 'planned',
      image_url: offer.image_url,
      notes,
      created_at: now,
      updated_at: now,
    })
    .select(TRIP_COLUMNS)
    .single();

  if (error || !data) {
    return { data, error };
  }

  const { error: scheduleError } = await copyOfferSchedule({
    sourceTripId: offer.id,
    targetTripId: data.id,
  });

  if (scheduleError) {
    return { data: null, error: scheduleError };
  }

  const { error: participantError } = await addParticipant({
    tripId: data.id,
    userId: ownerId,
    role: 'owner',
    amountOwed: 0,
  });
  if (participantError) {
    return { data: null, error: participantError };
  }

  return { data, error };
};

module.exports = {
  getOffers,
  getOfferById,
  getProfilesByIds,
  getParticipatingTripIds,
  createTripFromOffer,
};
