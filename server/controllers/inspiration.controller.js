const { supabaseAuthClient } = require('../configs/supabaseClient');
const {
  getOffers,
  getOfferById,
  getProfilesByIds,
  getParticipatingTripIds,
  createTripFromOffer: createTripFromOfferRepository,
} = require('../repositories/inspiration.repository');

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
    res.status(401).json({ message: 'Niepoprawny lub wygasły access token' });
    return null;
  }

  return data.user;
};

const resolveOptionalAuthenticatedUser = async (req) => {
  const accessToken = parseAccessToken(req);

  if (!accessToken) {
    return null;
  }

  const { data, error } = await supabaseAuthClient.auth.getUser(accessToken);

  if (error || !data?.user?.id) {
    return null;
  }

  return data.user;
};

const parseBudget = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const parseDate = (value) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
};

const getDaysCount = (startDate, endDate) => {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = end.getTime() - start.getTime();

  if (!Number.isFinite(diff) || diff < 0) {
    return 1;
  }

  return Math.max(1, Math.floor(diff / 86_400_000) + 1);
};

const getOfferSource = (status) => {
  const safeStatus = String(status || '').toLowerCase();
  return safeStatus.includes('ai') ? 'ai' : 'user';
};

const getAuthorName = (profile) => {
  if (!profile) {
    return 'Użytkownik aplikacji';
  }

  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  return fullName || 'Użytkownik aplikacji';
};

const normalizeText = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const hasAnyKeyword = (text, keywords) => keywords.some((keyword) => text.includes(keyword));

const tripTypeOptions = [
  {
    id: 'mountains',
    label: 'Góry',
    keywords: ['gory', 'mountain', 'alpy', 'tatry', 'zakopane', 'bieszczady', 'beskidy', 'karkonosze', 'dolomity', 'himalaje', 'narty', 'snowboard'],
  },
  {
    id: 'sea',
    label: 'Morze',
    keywords: ['morze', 'sea', 'plaza', 'beach', 'ocean', 'baltyk', 'wyspa', 'bali', 'malediwy', 'santorini', 'majorka', 'chorwacja', 'grecja', 'gdansk', 'sopot', 'gdynia'],
  },
  {
    id: 'city',
    label: 'City break',
    keywords: ['city', 'miasto', 'city break', 'paryz', 'paris', 'rzym', 'rome', 'barcelona', 'lizbona', 'londyn', 'london', 'praga', 'budapeszt', 'florencja', 'wenecja', 'tokio', 'krakow', 'warszawa'],
  },
  {
    id: 'nature',
    label: 'Natura',
    keywords: ['natura', 'nature', 'las', 'jezioro', 'mazury', 'park', 'fiord', 'fiordy', 'norwegia', 'islandia', 'tromso'],
  },
  {
    id: 'active',
    label: 'Aktywnie',
    keywords: ['aktywn', 'trekking', 'rower', 'hiking', 'kajak', 'wspinacz', 'sport', 'trasa', 'szlak'],
  },
  {
    id: 'culture',
    label: 'Zwiedzanie',
    keywords: ['zwiedz', 'muzeum', 'kultura', 'zabytki', 'historia', 'sztuka', 'zamek', 'stare miasto'],
  },
];

const regionOptions = [
  {
    id: 'poland',
    label: 'Polska',
    keywords: ['polska', 'zakopane', 'krakow', 'warszawa', 'gdansk', 'sopot', 'gdynia', 'wroclaw', 'poznan', 'mazury', 'tatry', 'bieszczady', 'torun', 'lublin', 'lodz'],
  },
  {
    id: 'europe',
    label: 'Europa',
    keywords: ['europa', 'wlochy', 'rzym', 'florencja', 'wenecja', 'hiszpania', 'barcelona', 'portugalia', 'lizbona', 'francja', 'paryz', 'norwegia', 'tromso', 'chorwacja', 'grecja', 'praga', 'budapeszt', 'londyn', 'alpy', 'szwajcaria'],
  },
  {
    id: 'asia',
    label: 'Azja',
    keywords: ['azja', 'japonia', 'tokio', 'bali', 'indonezja', 'tajlandia', 'bangkok', 'wietnam', 'seul', 'korea'],
  },
  {
    id: 'africa',
    label: 'Afryka',
    keywords: ['afryka', 'egipt', 'maroko', 'tanzania', 'kenia', 'zanzibar'],
  },
  {
    id: 'north_america',
    label: 'Ameryka Płn.',
    keywords: ['usa', 'kanada', 'nowy jork', 'new york', 'los angeles', 'meksyk'],
  },
  {
    id: 'south_america',
    label: 'Ameryka Płd.',
    keywords: ['ameryka poludniowa', 'brazylia', 'argentyna', 'peru', 'chile', 'kolumbia'],
  },
];

const resolveTripType = (trip) => {
  const text = normalizeText(`${trip.destination} ${trip.notes} ${trip.status}`);
  const matchedType = tripTypeOptions.find((type) => hasAnyKeyword(text, type.keywords));
  return matchedType || { id: 'other', label: 'Inne' };
};

const resolveRegion = (trip) => {
  const text = normalizeText(`${trip.destination} ${trip.notes} ${trip.status}`);
  const matchedRegion = regionOptions.find((region) => hasAnyKeyword(text, region.keywords));
  return matchedRegion || { id: 'world', label: 'Świat' };
};

const resolveBudget = (price) => {
  if (price === null || price === undefined || Number.isNaN(Number(price))) {
    return { id: 'unknown', label: 'Budżet do ustalenia' };
  }

  const numericPrice = Number(price);

  if (numericPrice <= 500) {
    return { id: 'low', label: 'Do 500 PLN' };
  }

  if (numericPrice <= 1000) {
    return { id: 'medium', label: 'Do 1000 PLN' };
  }

  if (numericPrice <= 2000) {
    return { id: 'standard', label: 'Do 2000 PLN' };
  }

  return { id: 'premium', label: 'Premium' };
};

const resolveDuration = (daysCount) => {
  if (daysCount <= 3) {
    return { id: 'short', label: 'Krótki wyjazd' };
  }

  if (daysCount <= 7) {
    return { id: 'week', label: 'Do tygodnia' };
  }

  return { id: 'long', label: 'Dłuższy wyjazd' };
};

const getNotesSummary = (notes) => {
  if (!notes) return null;
  const trimmedNotes = String(notes).trim();

  try {
    const parsed = JSON.parse(trimmedNotes);
    if (typeof parsed?.summary === 'string' && parsed.summary.trim()) {
      return parsed.summary.trim();
    }
  } catch {
    const start = trimmedNotes.indexOf('{');
    const end = trimmedNotes.lastIndexOf('}');

    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(trimmedNotes.slice(start, end + 1));
        if (typeof parsed?.summary === 'string' && parsed.summary.trim()) {
          return parsed.summary.trim();
        }
      } catch {
        return trimmedNotes.startsWith('{') || trimmedNotes.startsWith('[') ? null : trimmedNotes;
      }
    }
  }

  return trimmedNotes.startsWith('{') || trimmedNotes.startsWith('[') ? null : trimmedNotes;
};

const normalizeTrip = (trip, profilesMap = new Map()) => {
  const profile = profilesMap.get(trip.owner_id);
  const daysCount = getDaysCount(trip.start_date, trip.end_date);
  const tripType = resolveTripType(trip);
  const region = resolveRegion(trip);
  const priceFrom = trip.total_budget === null || trip.total_budget === undefined ? null : Number(trip.total_budget);
  const budget = resolveBudget(priceFrom);
  const duration = resolveDuration(daysCount);

  return {
    id: trip.id,
    ownerId: trip.owner_id,
    destination: trip.destination,
    startDate: trip.start_date,
    endDate: trip.end_date,
    priceFrom,
    imageUrl: trip.image_url,
    notes: getNotesSummary(trip.notes),
    status: trip.status,
    daysCount,
    source: getOfferSource(trip.status),
    authorName: getAuthorName(profile),
    isSaved: false,
    tripType: tripType.id,
    tripTypeLabel: tripType.label,
    region: region.id,
    regionLabel: region.label,
    budgetLevel: budget.id,
    budgetLabel: budget.label,
    durationType: duration.id,
    durationLabel: duration.label,
    createdAt: trip.created_at || null,
    updatedAt: trip.updated_at || null,
  };
};

const buildProfilesMap = async (trips) => {
  const ownerIds = trips.map((trip) => trip.owner_id);
  const { data, error } = await getProfilesByIds(ownerIds);

  if (error) {
    return new Map();
  }

  return new Map((data || []).map((profile) => [profile.id, profile]));
};

const parseSelectFilter = (value, allowedValues) => {
  if (typeof value !== 'string' || value === 'all') {
    return undefined;
  }

  return allowedValues.includes(value) ? value : undefined;
};

const filterNormalizedOffers = (offers, filters) => offers.filter((offer) => {
  if (filters.tripType && offer.tripType !== filters.tripType) {
    return false;
  }

  if (filters.region && offer.region !== filters.region) {
    return false;
  }

  if (filters.budgetLevel && offer.budgetLevel !== filters.budgetLevel) {
    return false;
  }

  if (filters.durationType && offer.durationType !== filters.durationType) {
    return false;
  }

  return true;
});

const listOffers = async (req, res, next) => {
  try {
    const user = await resolveOptionalAuthenticatedUser(req);
    let excludeTripIds = [];

    if (user?.id) {
      const { data: participatingTripIds, error: participatingError } = await getParticipatingTripIds(user.id);

      if (participatingError) {
        return res.status(500).json({ message: 'Nie udało się pobrać Twoich planów do filtrowania inspiracji' });
      }

      excludeTripIds = participatingTripIds;
    }

    const filters = {
      searchText: typeof req.query.searchText === 'string' ? req.query.searchText.trim() : undefined,
      minBudget: parseBudget(req.query.minBudget),
      maxBudget: parseBudget(req.query.maxBudget),
      status: typeof req.query.status === 'string' ? req.query.status.trim() : undefined,
      source: req.query.source === 'ai' || req.query.source === 'user' ? req.query.source : undefined,
      tripType: parseSelectFilter(req.query.tripType, ['sea', 'mountains', 'city', 'nature', 'culture', 'active', 'other']),
      region: parseSelectFilter(req.query.region, ['poland', 'europe', 'asia', 'africa', 'north_america', 'south_america', 'world']),
      budgetLevel: parseSelectFilter(req.query.budgetLevel, ['unknown', 'low', 'medium', 'standard', 'premium']),
      durationType: parseSelectFilter(req.query.durationType, ['short', 'week', 'long']),
      startDateFrom: parseDate(req.query.startDateFrom),
      startDateTo: parseDate(req.query.startDateTo),
      excludeOwnerId: user?.id,
      excludeTripIds,
    };

    const { data, error } = await getOffers(filters);

    if (error) {
      return res.status(500).json({ message: 'Nie udało się pobrać propozycji ofert' });
    }

    const trips = data || [];
    const profilesMap = await buildProfilesMap(trips);
    const normalizedOffers = trips.map((trip) => normalizeTrip(trip, profilesMap));
    const offers = filterNormalizedOffers(normalizedOffers, filters);

    return res.status(200).json({
      message: 'Propozycje ofert pobrane poprawnie.',
      offers,
      count: offers.length,
    });
  } catch (err) {
    return next(err);
  }
};

const getOfferDetails = async (req, res, next) => {
  try {
    const { offerId } = req.params;
    const { data, error } = await getOfferById(offerId);

    if (error) {
      return res.status(500).json({ message: 'Nie udało się pobrać szczegółów oferty' });
    }

    if (!data) {
      return res.status(404).json({ message: 'Nie znaleziono oferty' });
    }

    const profilesMap = await buildProfilesMap([data]);

    return res.status(200).json({
      message: 'Szczegóły oferty pobrane poprawnie.',
      offer: normalizeTrip(data, profilesMap),
    });
  } catch (err) {
    return next(err);
  }
};

const createTripFromOffer = async (req, res, next) => {
  try {
    const user = await resolveAuthenticatedUser(req, res);

    if (!user) {
      return;
    }

    const { offerId } = req.params;
    const { data: offer, error: offerError } = await getOfferById(offerId);

    if (offerError) {
      return res.status(500).json({ message: 'Nie udało się pobrać oferty' });
    }

    if (!offer) {
      return res.status(404).json({ message: 'Nie znaleziono oferty' });
    }

    if (offer.owner_id === user.id) {
      return res.status(400).json({ message: 'Ta inspiracja jest już Twoim planem' });
    }

    const { data: existingPlanIds, error: existingPlansError } = await getParticipatingTripIds(user.id);
    if (existingPlansError) {
      return res.status(500).json({ message: 'Nie udało się sprawdzić Twoich planów' });
    }

    if ((existingPlanIds || []).includes(offer.id)) {
      return res.status(400).json({ message: 'Ta inspiracja jest już na Twojej liście planów' });
    }

    const { data: trip, error: insertError } = await createTripFromOfferRepository({
      ownerId: user.id,
      offer,
    });

    if (insertError) {
      return res.status(500).json({ message: 'Nie udało się utworzyć podróży z oferty' });
    }

    return res.status(201).json({
      message: 'Podróż została utworzona na podstawie inspiracji.',
      trip: normalizeTrip(trip),
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  listOffers,
  getOfferDetails,
  createTripFromOffer,
};
