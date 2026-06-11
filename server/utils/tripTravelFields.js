const roundMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100) / 100;
};

const NON_EUROPE_DESTINATION_PATTERN =
  /\b(usa|stany|nowy jork|new york|los angeles|chicago|miami|kanada|canada|meksyk|mexico|brazylia|brazil|argentyna|maroko|egipt|egypt|dubaj|dubai|emiraty|qatar|chiny|china|japonia|japan|tokio|tokyo|seul|korea|tajlandia|thailand|bangkok|indie|india|indonezja|bali|australia|nowa zelandia|new zealand)\b/i;

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
  travelWay: cleanWay(tripPlan.travelWay ?? tripPlan.travel_way) ?? inferWayFromText(tripPlan.bestTransport),
  returnWay: cleanWay(tripPlan.returnWay ?? tripPlan.return_way) ?? inferWayFromText(tripPlan.bestTransport),
});

const applyTripTravelFields = (tripPlan = {}, source = {}) => {
  const fields = getTripTravelFields(source);
  return {
    ...tripPlan,
    travelCost: fields.travelCost,
    returnCost: fields.returnCost,
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

const normalizeFlightCost = (cost, { destination, travelers }) => {
  const passengerCount = Math.max(Number(travelers) || 1, 1);
  const intercontinental = NON_EUROPE_DESTINATION_PATTERN.test(String(destination || ''));
  const minPerPerson = intercontinental ? 1900 : 200;
  const maxPerPerson = intercontinental ? 3000 : 500;
  const minTotal = minPerPerson * passengerCount;
  const maxTotal = maxPerPerson * passengerCount;
  const numericCost = roundMoney(cost);
  if (numericCost <= 0) return minTotal;
  return Math.min(Math.max(numericCost, minTotal), maxTotal);
};

const normalizeTripTravelCosts = (tripPlan = {}, formData = {}) => {
  const fields = getTripTravelFields(tripPlan);
  const normalized = {
    ...tripPlan,
    travelCost: isPlaneWay(fields.travelWay)
      ? normalizeFlightCost(fields.travelCost, formData)
      : fields.travelCost,
    returnCost: isPlaneWay(fields.returnWay)
      ? normalizeFlightCost(fields.returnCost, formData)
      : fields.returnCost,
    travelWay: fields.travelWay,
    returnWay: fields.returnWay,
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
