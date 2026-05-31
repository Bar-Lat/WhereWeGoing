import type { DayPlan } from '@/stores/tripStore';
import type { TripScheduleActivityDto, TripScheduleDayDto } from '@/types/trips';
import { parseActivityCoordinates } from '@/utils/activityMap';

export const createClientActivityKey = () =>
  `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const getActivityTimelineKey = (
  activity: { id?: string; clientKey?: string },
  dayIndex: number,
  actIndex: number
) => activity.id ?? activity.clientKey ?? `${dayIndex}-${actIndex}`;

export const mapScheduleActivityToPlan = (
  activity: TripScheduleActivityDto
): DayPlan['activities'][number] => ({
  id: activity.id,
  time: activity.time || '09:00',
  name: activity.name || 'Aktywność',
  description: activity.description || '',
  category: activity.category || 'inne',
  estimatedCost: Number(activity.cost) || 0,
  location: activity.location || '',
  durationMinutes: activity.durationMinutes ?? undefined,
  coordinates: parseActivityCoordinates(activity.coordinates) ?? undefined,
});

export const ensureDayActivityClientKeys = (day: DayPlan): DayPlan['activities'] =>
  day.activities.map((activity) =>
    activity.id || activity.clientKey
      ? activity
      : { ...activity, clientKey: createClientActivityKey() }
  );

const findUnusedScheduleMatch = (
  activity: DayPlan['activities'][number],
  scheduleActivities: TripScheduleActivityDto[],
  usedScheduleIds: Set<string>
) =>
  scheduleActivities.find(
    (item) =>
      !usedScheduleIds.has(item.id) &&
      item.name === activity.name &&
      item.time === activity.time
  ) ||
  scheduleActivities.find(
    (item) => !usedScheduleIds.has(item.id) && item.name === activity.name
  );

const findPlanActivityMatch = (
  scheduleActivity: TripScheduleActivityDto,
  planActivities: DayPlan['activities'],
  usedPlanIndices: Set<number>
) => {
  const byIdIndex = planActivities.findIndex(
    (activity, index) => !usedPlanIndices.has(index) && activity.id === scheduleActivity.id
  );
  if (byIdIndex >= 0) return byIdIndex;

  const byNameTimeIndex = planActivities.findIndex(
    (activity, index) =>
      !usedPlanIndices.has(index) &&
      activity.name === scheduleActivity.name &&
      activity.time === scheduleActivity.time
  );
  if (byNameTimeIndex >= 0) return byNameTimeIndex;

  return planActivities.findIndex(
    (activity, index) => !usedPlanIndices.has(index) && activity.name === scheduleActivity.name
  );
};

export const assignActivityIdsForDay = (
  day: DayPlan,
  scheduleDay: TripScheduleDayDto | undefined
): DayPlan['activities'] => {
  if (!scheduleDay?.activities?.length) return ensureDayActivityClientKeys(day);

  const usedScheduleIds = new Set<string>();

  return ensureDayActivityClientKeys({
    ...day,
    activities: day.activities.map((activity) => {
      if (activity.id) {
        const byId = scheduleDay.activities.find(
          (item) => item.id === activity.id && !usedScheduleIds.has(item.id)
        );
        if (byId) {
          usedScheduleIds.add(byId.id);
          return {
            ...activity,
            location: byId.location || activity.location,
            durationMinutes: byId.durationMinutes ?? activity.durationMinutes,
            coordinates:
              parseActivityCoordinates(byId.coordinates) ?? activity.coordinates ?? undefined,
          };
        }
      }

      const match = findUnusedScheduleMatch(activity, scheduleDay.activities, usedScheduleIds);
      if (!match) return activity;

      usedScheduleIds.add(match.id);
      return {
        ...activity,
        id: match.id,
        location: match.location || activity.location,
        durationMinutes: match.durationMinutes ?? activity.durationMinutes,
        coordinates:
          parseActivityCoordinates(match.coordinates) ?? activity.coordinates ?? undefined,
      };
    }),
  });
};

export const mergePlanDayWithSchedule = (
  day: DayPlan,
  scheduleDay: TripScheduleDayDto | undefined,
  preserveLocalOrder: boolean
): DayPlan => {
  if (!scheduleDay) return day;

  if (preserveLocalOrder) {
    let activities = assignActivityIdsForDay(day, scheduleDay);
    const knownIds = new Set(activities.map((activity) => activity.id).filter(Boolean));

    const appended = scheduleDay.activities
      .filter((scheduleActivity) => !knownIds.has(scheduleActivity.id))
      .map((scheduleActivity) => ({
        ...mapScheduleActivityToPlan(scheduleActivity),
        clientKey: createClientActivityKey(),
      }));

    if (appended.length > 0) {
      activities = [...activities, ...appended];
    }

    return {
      ...day,
      activities,
      transits: day.transits || scheduleDay.transits,
    };
  }

  const usedPlanIndices = new Set<number>();
  const activities: DayPlan['activities'] = scheduleDay.activities.map((scheduleActivity) => {
    const planIndex = findPlanActivityMatch(scheduleActivity, day.activities, usedPlanIndices);
    const planActivity = planIndex >= 0 ? day.activities[planIndex] : null;
    if (planIndex >= 0) usedPlanIndices.add(planIndex);

    return {
      ...(planActivity || mapScheduleActivityToPlan(scheduleActivity)),
      id: scheduleActivity.id,
      time: scheduleActivity.time || planActivity?.time || '09:00',
      name: scheduleActivity.name || planActivity?.name || 'Aktywność',
      description: scheduleActivity.description ?? planActivity?.description ?? '',
      category: scheduleActivity.category || planActivity?.category || 'inne',
      estimatedCost: Number(scheduleActivity.cost ?? planActivity?.estimatedCost) || 0,
      location: scheduleActivity.location || planActivity?.location || '',
      durationMinutes:
        scheduleActivity.durationMinutes ??
        planActivity?.durationMinutes ??
        undefined,
      coordinates:
        parseActivityCoordinates(scheduleActivity.coordinates) ??
        planActivity?.coordinates ??
        undefined,
      imageUrl: planActivity?.imageUrl ?? undefined,
      clientKey: planActivity?.clientKey,
    };
  });

  day.activities.forEach((activity, index) => {
    if (!usedPlanIndices.has(index)) {
      activities.push(
        activity.id || activity.clientKey
          ? activity
          : { ...activity, clientKey: createClientActivityKey() }
      );
    }
  });

  return { ...day, activities, transits: day.transits || scheduleDay.transits };
};
