const { supabaseDbClient } = require('../configs/supabaseClient');

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

const createTripFromOffer = async ({ ownerId, offer }) => {
  const now = new Date().toISOString();
  const sourceNote = `Utworzono na podstawie inspiracji: ${offer.destination}.`;
  const notes = offer.notes ? `${offer.notes}\n\n${sourceNote}` : sourceNote;

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

  return { data, error };
};

module.exports = {
  getOffers,
  getOfferById,
  getProfilesByIds,
  createTripFromOffer,
};
