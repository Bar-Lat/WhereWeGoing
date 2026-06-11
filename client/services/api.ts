import axios from 'axios';

const normalizeApiUrl = (url: string) => {
  const trimmedUrl = url.trim();
  const urlWithProtocol = /^https?:\/\//i.test(trimmedUrl)
    ? trimmedUrl
    : `https://${trimmedUrl}`;

  return urlWithProtocol.replace(/\/$/, '');
};

const API_BASE_URL = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api');
const API_TIMEOUT_MS = 60000;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

