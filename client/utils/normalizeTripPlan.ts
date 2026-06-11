import type { TripPlan } from '@/stores/tripStore';

export const roundMoney = (value: unknown) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100) / 100;
};

export const normalizeTripPlanNumbers = (plan: TripPlan): TripPlan => ({
  ...plan,
  estimatedTotalCost: roundMoney(plan.estimatedTotalCost),
  travelCost: roundMoney(plan.travelCost),
  returnCost: roundMoney(plan.returnCost),
  travelDurationMinutes: Math.round(Number(plan.travelDurationMinutes) || 0),
  returnDurationMinutes: Math.round(Number(plan.returnDurationMinutes) || 0),
  days: (plan.days || []).map((day) => ({
    ...day,
    estimatedDayCost: roundMoney(day.estimatedDayCost),
    activities: (day.activities || []).map((activity) => ({
      ...activity,
      estimatedCost: roundMoney(activity.estimatedCost),
    })),
    transits: day.transits?.map((transit) => ({
      ...transit,
      estimatedCost: roundMoney(transit.estimatedCost),
    })),
  })),
});
