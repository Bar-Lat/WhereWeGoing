export type TripAccessRole = 'owner' | 'participant';

export type TripDto = {
  id: string;
  ownerId: string;
  destination: string;
  startDate: string;
  endDate: string;
  totalBudget: number | null;
  totalCost: number | null;
  status: string;
  imageUrl: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  participantsCount: number;
  accessRole: TripAccessRole;
};

export type TripParticipantDto = {
  id: string;
  profileId: string;
  relationId: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
  avatar: string | null;
  role: string;
  isOwner: boolean;
  amountOwed: number | null;
  currency: string;
};

export type TripsResponse = {
  trips: TripDto[];
};

export type TripParticipantsResponse = {
  participants: TripParticipantDto[];
  count: number;
  accessRole: TripAccessRole;
};

export type AddTripParticipantResponse = {
  message: string;
  participant: TripParticipantDto;
  amountPerPerson?: number;
  participants?: TripParticipantDto[];
};

export type RemoveTripParticipantResponse = {
  message: string;
  amountPerPerson?: number;
  participants?: TripParticipantDto[];
};
