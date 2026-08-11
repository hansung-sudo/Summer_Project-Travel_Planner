import axios from 'axios';
import type { ApiErrorResponse } from '../types';

export const serverUrl = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
).replace(/\/$/, '');

export class ApiRequestError extends Error {
  readonly code?: string;
  readonly status?: number;

  constructor(
    message: string,
    code?: string,
    status?: number
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
  }
}

export const apiClient = axios.create({
  baseURL: `${serverUrl}/api/v1`,
  timeout: 10_000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
      const response = error.response;
      return Promise.reject(
        new ApiRequestError(
          response?.data?.message || '서버에 연결할 수 없습니다.',
          response?.data?.code,
          response?.status
        )
      );
    }
    return Promise.reject(error);
  }
);

export const authConfig = (token: string) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export const getRequestErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : '요청을 처리할 수 없습니다.';
