import axios from 'axios';
import { api } from './api';
import type { InspirationOfferDto, OfferDetailsDto, OfferFilterDto } from '@/types/inspiration';

type OffersResponse = {
  message: string;
  offers: InspirationOfferDto[];
  count: number;
};

type OfferDetailsResponse = {
  message: string;
  offer: OfferDetailsDto;
};

type CreatedTripResponse = {
  message: string;
  trip: {
    id: string;
    ownerId: string;
    destination: string;
    startDate: string;
    endDate: string;
    totalBudget: number | null;
    status: string;
    imageUrl: string;
    notes: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const responseMessage = error.response?.data?.message;
    if (typeof responseMessage === 'string' && responseMessage.length > 0) {
      return responseMessage;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const removeEmptyValues = (filters: OfferFilterDto) => {
  const params: Record<string, string | number> = {};

  if (filters.searchText?.trim()) {
    params.searchText = filters.searchText.trim();
  }

  if (filters.minBudget !== undefined && Number.isFinite(filters.minBudget)) {
    params.minBudget = filters.minBudget;
  }

  if (filters.maxBudget !== undefined && Number.isFinite(filters.maxBudget)) {
    params.maxBudget = filters.maxBudget;
  }

  if (filters.status?.trim()) {
    params.status = filters.status.trim();
  }

  if (filters.source && filters.source !== 'all') {
    params.source = filters.source;
  }

  if (filters.tripType && filters.tripType !== 'all') {
    params.tripType = filters.tripType;
  }

  if (filters.region && filters.region !== 'all') {
    params.region = filters.region;
  }

  if (filters.budgetLevel && filters.budgetLevel !== 'all') {
    params.budgetLevel = filters.budgetLevel;
  }

  if (filters.durationType && filters.durationType !== 'all') {
    params.durationType = filters.durationType;
  }

  if (filters.startDateFrom) {
    params.startDateFrom = filters.startDateFrom;
  }

  if (filters.startDateTo) {
    params.startDateTo = filters.startDateTo;
  }

  return params;
};

export const getInspirationOffers = async (filters: OfferFilterDto = {}) => {
  try {
    const { data } = await api.get<OffersResponse>('/inspiration/offers', {
      params: removeEmptyValues(filters),
    });
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udało się pobrać propozycji ofert'));
  }
};

export const getInspirationOfferDetails = async (offerId: string) => {
  try {
    const { data } = await api.get<OfferDetailsResponse>(`/inspiration/offers/${offerId}`);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udało się pobrać szczegółów oferty'));
  }
};

export const createTripFromOffer = async (accessToken: string, offerId: string) => {
  try {
    const { data } = await api.post<CreatedTripResponse>(
      `/inspiration/offers/${offerId}/create-trip`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udało się utworzyć podróży z oferty'));
  }
};
