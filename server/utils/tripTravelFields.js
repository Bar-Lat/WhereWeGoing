const roundMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100) / 100;
};

const normalizeSearchText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const NON_EUROPE_DESTINATION_PATTERN =
  /\b(usa|stany|ameryk|nowy jork|nowego jorku|new york|los angeles|chicago|miami|kanada|canada|meksyk|mexico|brazylia|brazil|argentyna|maroko|egipt|egypt|dubaj|dubai|emiraty|qatar|chiny|china|japonia|japan|tokio|tokyo|seul|korea|tajlandia|thailand|bangkok|indie|india|indonezja|bali|australia|nowa zelandia|new zealand)\b/i;

const CITY_COORDINATES = [
  { pattern: /\b(rzeszow|rzeszowa|rzeszowie)\b/, latitude: 50.0413, longitude: 21.999 },
  { pattern: /\b(krakow|krakowa|krakowie)\b/, latitude: 50.0647, longitude: 19.945 },
  { pattern: /\b(gdansk|gdanska|gdansku|morze|morzem|trojmiasto|trojmiasta)\b/, latitude: 54.352, longitude: 18.6466 },
  { pattern: /\b(warszawa|warszawy|warszawie)\b/, latitude: 52.2297, longitude: 21.0122 },
  { pattern: /\b(wroclaw|wroclawia|wroclawiu)\b/, latitude: 51.1079, longitude: 17.0385 },
  { pattern: /\b(poznan|poznania|poznaniu)\b/, latitude: 52.4064, longitude: 16.9252 },
  { pattern: /\b(zakopane|zakopanego|zakopanem)\b/, latitude: 49.2992, longitude: 19.9496 },
  { pattern: /\b(new york|nowy jork|nowego jorku)\b/, latitude: 40.7128, longitude: -74.006 },
];

const cleanWay = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const inferWayFromText = (value) => {
  const text = String(value || '').toLowerCase();
  if (/\b(samolot|lot|przelot)\b/.test(text)) return 'Samolot';
  if (/\b(pociag|pociąg|kolej)\b/.test(text)) return 'Pociąg';
  if (/\b(autobus|bus)\b/.test(text)) return 'Autobus';
  if (/\b(samochod|samochód|auto)\b/.test(text)) return 'Samochód';
  return null;
};

const getTripTravelFields = (tripPlan = {}) => ({
  travelCost: roundMoney(tripPlan.travelCost ?? tripPlan.travel_cost),
  returnCost: roundMoney(tripPlan.returnCost ?? tripPlan.return_cost),
  travelDurationMinutes: Math.round(Number(tripPlan.travelDurationMinutes ?? tripPlan.travel_duration_minutes) || 0),
  returnDurationMinutes: Math.round(Number(tripPlan.returnDurationMinutes ?? tripPlan.return_duration_minutes) || 0),
  travelWay: cleanWay(tripPlan.travelWay ?? tripPlan.travel_way) ?? inferWayFromText(tripPlan.bestTransport),
  returnWay: cleanWay(tripPlan.returnWay ?? tripPlan.return_way) ?? inferWayFromText(tripPlan.bestTransport),
});

const applyTripTravelFields = (tripPlan = {}, source = {}) => {
  const fields = getTripTravelFields(source);
  return {
    ...tripPlan,
    travelCost: fields.travelCost,
    returnCost: fields.returnCost,
    travelDurationMinutes: fields.travelDurationMinutes,
    returnDurationMinutes: fields.returnDurationMinutes,
    travelWay: fields.travelWay,
    returnWay: fields.returnWay,
  };
};

const getTripBoundaryTravelCost = (tripOrPlan = {}) => {
  const fields = getTripTravelFields(tripOrPlan);
  return fields.travelCost + fields.returnCost;
};

const buildTripTravelDbFields = (tripPlan = {}) => {
  const fields = getTripTravelFields(tripPlan);
  return {
    travel_cost: fields.travelCost,
    return_cost: fields.returnCost,
    travel_way: fields.travelWay,
    return_way: fields.returnWay,
  };
};

const isPlaneWay = (value) => /\b(samolot|lot|przelot)\b/i.test(String(value || ''));

const getCoordinates = (value) => {
  if (!value || typeof value !== 'object') return null;
  const latitude = Number(value.latitude ?? value.lat);
  const longitude = Number(value.longitude ?? value.lng ?? value.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
};

const resolveKnownCoordinates = (value) => {
  const text = normalizeSearchText(value);
  return CITY_COORDINATES.find((city) => city.pattern.test(text)) || null;
};

const haversineDistanceKm = (from, to) => {
  if (!from || !to) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const estimateTripDistanceKm = (formData = {}) => {
  const origin = getCoordinates(formData.originCoordinates) ?? resolveKnownCoordinates(formData.originLabel);
  const destination = resolveKnownCoordinates(formData.destination);
  return haversineDistanceKm(origin, destination);
};

const choosePreferredTravelWay = (fields, formData = {}) => {
  const preferences = Array.isArray(formData.transport) ? formData.transport : [];
  const distanceKm = estimateTripDistanceKm(formData);
  const intercontinental = NON_EUROPE_DESTINATION_PATTERN.test(normalizeSearchText(formData.destination));

  if (intercontinental || (distanceKm !== null && distanceKm >= 1200)) {
    return 'Samolot';
  }

  if (preferences.includes('car') && (distanceKm === null || distanceKm <= 850)) {
    return 'Samochód';
  }

  if (preferences.includes('metro')) {
    return distanceKm !== null && distanceKm <= 80 ? 'Autobus' : 'Pociąg';
  }

  if (preferences.includes('bike') && distanceKm !== null && distanceKm <= 40) return 'Rower';
  if (preferences.includes('walking') && distanceKm !== null && distanceKm <= 12) return 'Pieszo';

  return fields.travelWay || fields.returnWay || (distanceKm !== null && distanceKm <= 120 ? 'Samochód' : 'Pociąg');
};

const normalizeFlightCost = (cost, { destination, travelers }) => {
  const passengerCount = Math.max(Number(travelers) || 1, 1);
  const intercontinental = NON_EUROPE_DESTINATION_PATTERN.test(normalizeSearchText(destination));
  const minPerPerson = intercontinental ? 1800 : 200;
  const maxPerPerson = intercontinental ? 3000 : 500;
  const minTotal = minPerPerson * passengerCount;
  const maxTotal = maxPerPerson * passengerCount;
  const numericCost = roundMoney(cost);
  if (numericCost <= 0) return minTotal;
  return Math.min(Math.max(numericCost, minTotal), maxTotal);
};

const estimateNonFlightCost = (way, distanceKm, travelers) => {
  if (distanceKm === null || distanceKm === undefined) return 0;
  const passengerCount = Math.max(Number(travelers) || 1, 1);
  if (/\b(samochod|samochód)\b/i.test(String(way || ''))) return roundMoney(Math.max(35, distanceKm * 1.15));
  if (/\b(pociag|pociąg)\b/i.test(String(way || ''))) return roundMoney(Math.max(20, distanceKm * 0.28 * passengerCount));
  if (/\b(autobus|bus)\b/i.test(String(way || ''))) return roundMoney(Math.max(15, distanceKm * 0.2 * passengerCount));
  return 0;
};

const estimateTravelDurationMinutes = (way, formData = {}) => {
  const distanceKm = estimateTripDistanceKm(formData);
  const intercontinental = NON_EUROPE_DESTINATION_PATTERN.test(normalizeSearchText(formData.destination));
  const text = String(way || '').toLowerCase();
  if (isPlaneWay(way)) return intercontinental ? 12 * 60 : 3 * 60;
  if (text.includes('samoch')) return Math.round(((distanceKm ?? 160) / 75) * 60);
  if (text.includes('poci')) return Math.round(((distanceKm ?? 220) / 95) * 60);
  if (text.includes('autobus') || text.includes('bus')) return Math.round(((distanceKm ?? 160) / 65) * 60);
  return 120;
};

const normalizeTripTravelCosts = (tripPlan = {}, formData = {}) => {
  const fields = getTripTravelFields(tripPlan);
  const preferredWay = choosePreferredTravelWay(fields, formData);
  const distanceKm = estimateTripDistanceKm(formData);
  const travelWay = preferredWay;
  const returnWay = preferredWay;
  const fallbackNonFlightCost = estimateNonFlightCost(travelWay, distanceKm, formData.travelers);
  const travelWayChanged = cleanWay(fields.travelWay) !== cleanWay(travelWay);
  const returnWayChanged = cleanWay(fields.returnWay) !== cleanWay(returnWay);
  const travelCostBase = fields.travelCost > 0 && !travelWayChanged ? fields.travelCost : fallbackNonFlightCost;
  const returnCostBase = fields.returnCost > 0 && !returnWayChanged ? fields.returnCost : fallbackNonFlightCost;
  const estimatedTravelDuration = estimateTravelDurationMinutes(travelWay, formData);
  const estimatedReturnDuration = estimateTravelDurationMinutes(returnWay, formData);
  const normalized = {
    ...tripPlan,
    travelCost: isPlaneWay(travelWay)
      ? normalizeFlightCost(travelCostBase, formData)
      : travelCostBase,
    returnCost: isPlaneWay(returnWay)
      ? normalizeFlightCost(returnCostBase, formData)
      : returnCostBase,
    travelDurationMinutes: isPlaneWay(travelWay)
      ? Math.max(fields.travelDurationMinutes || 0, estimatedTravelDuration)
      : fields.travelDurationMinutes || estimatedTravelDuration,
    returnDurationMinutes: isPlaneWay(returnWay)
      ? Math.max(fields.returnDurationMinutes || 0, estimatedReturnDuration)
      : fields.returnDurationMinutes || estimatedReturnDuration,
    travelWay,
    returnWay,
  };
  if (Array.isArray(normalized.days)) {
    const dayTotal = normalized.days.reduce((sum, day) => sum + (Number(day?.estimatedDayCost) || 0), 0);
    normalized.estimatedTotalCost = roundMoney(dayTotal + getTripBoundaryTravelCost(normalized));
  }
  return normalized;
};

module.exports = {
  applyTripTravelFields,
  buildTripTravelDbFields,
  getTripBoundaryTravelCost,
  getTripTravelFields,
  normalizeTripTravelCosts,
  roundMoney,
};
