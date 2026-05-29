import axios from 'axios';

const normalizeApiUrl = (url: string) => {
  const trimmedUrl = url.trim();
  const urlWithProtocol = /^https?:\/\//i.test(trimmedUrl)
    ? trimmedUrl
    : `https://${trimmedUrl}`;

  return urlWithProtocol.replace(/\/$/, '');
};

const API_BASE_URL = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api');

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

