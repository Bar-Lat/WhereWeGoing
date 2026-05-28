export type UUID = string;
export type IsoDate = string;

export type OfferSource = 'user' | 'ai';

export type TripType =
  | 'sea'
  | 'mountains'
  | 'city'
  | 'nature'
  | 'culture'
  | 'active'
  | 'other';

export type TripRegion =
  | 'poland'
  | 'europe'
  | 'asia'
  | 'africa'
  | 'north_america'
  | 'south_america'
  | 'world';

export type BudgetLevel = 'unknown' | 'low' | 'medium' | 'standard' | 'premium';

export type DurationType = 'short' | 'week' | 'long';

export type InspirationOfferDto = {
  id: UUID;
  ownerId: UUID;
  destination: string;
  startDate: IsoDate;
  endDate: IsoDate;
  priceFrom: number | null;
  imageUrl: string;
  notes: string | null;
  status: string;
  daysCount: number;
  source: OfferSource;
  authorName: string;
  isSaved: boolean;
  tripType: TripType;
  tripTypeLabel: string;
  region: TripRegion;
  regionLabel: string;
  budgetLevel: BudgetLevel;
  budgetLabel: string;
  durationType: DurationType;
  durationLabel: string;
};

export type OfferDetailsDto = InspirationOfferDto & {
  createdAt: string | null;
  updatedAt: string | null;
};

export type OfferFilterDto = {
  searchText?: string;
  minBudget?: number;
  maxBudget?: number;
  status?: string;
  source?: OfferSource | 'all';
  tripType?: TripType | 'all';
  region?: TripRegion | 'all';
  budgetLevel?: BudgetLevel | 'all';
  durationType?: DurationType | 'all';
  startDateFrom?: IsoDate;
  startDateTo?: IsoDate;
};

export type CreateTripFromOfferDto = {
  ownerId: UUID;
  destination: string;
  startDate: IsoDate;
  endDate: IsoDate;
  totalBudget: number | null;
  status: string;
  imageUrl: string;
  notes: string | null;
};
