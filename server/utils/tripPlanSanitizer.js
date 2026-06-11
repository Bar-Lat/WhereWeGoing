const TRAVEL_ACTIVITY_PATTERN =
  /\b(lot|przelot|wylot|przylot|samolot|flight|airport|lotnisko|transfer|dojazd|podroz|podróż|powrot|powrót|przyjazd|wyjazd)\b/i;

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const isTravelToDestinationActivity = (activity, index, activitiesLength) => {
  const category = normalizeText(activity?.category);
  const nameAndDescription = normalizeText([activity?.name, activity?.description].filter(Boolean).join(' '));
  const text = normalizeText([nameAndDescription, activity?.location].filter(Boolean).join(' '));

  if (!TRAVEL_ACTIVITY_PATTERN.test(text)) return false;

  const isEdgeActivity = index === 0 || index === activitiesLength - 1;
  const isTransportCategory = category === 'transport';
  const mentionsLongDistanceTravel =
    /\b(lot|przelot|wylot|przylot|samolot|flight|airport|lotnisko)\b/i.test(nameAndDescription);
  const mentionsTripBoundary =
    /\b(dojazd|podroz|podrozy|powrot|przyjazd|wyjazd|transfer)\b/i.test(text);

  return isTransportCategory || (isEdgeActivity && (mentionsLongDistanceTravel || mentionsTripBoundary));
};

const recalculateDayCost = (day) => {
  const activities = Array.isArray(day?.activities) ? day.activities : [];
  return activities.reduce((sum, activity) => sum + (Number(activity?.estimatedCost) || 0), 0);
};

const removeTravelToDestinationActivities = (tripPlan) => {
  if (!tripPlan || !Array.isArray(tripPlan.days)) return tripPlan;

  const days = tripPlan.days.map((day) => {
    const activities = Array.isArray(day?.activities) ? day.activities : [];
    const filteredActivities = activities.filter(
      (activity, index) => !isTravelToDestinationActivity(activity, index, activities.length)
    );

    if (filteredActivities.length === activities.length) return day;

    return {
      ...day,
      activities: filteredActivities,
      estimatedDayCost: recalculateDayCost({ ...day, activities: filteredActivities }),
    };
  });

  const estimatedTotalCost = days.reduce((sum, day) => sum + (Number(day?.estimatedDayCost) || 0), 0);

  return {
    ...tripPlan,
    days,
    estimatedTotalCost,
  };
};

module.exports = {
  removeTravelToDestinationActivities,
  isTravelToDestinationActivity,
};
