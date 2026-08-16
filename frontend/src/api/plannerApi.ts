import { apiClient, authConfig } from './client';
import type {
  ApiResponse,
  CreateScheduleInput,
  Day,
  ParticipantDto,
  Planner,
  PlannerSnapshot,
  Schedule,
  UpdateScheduleInput,
} from '../types';

interface AuthSessionResult {
  participant: ParticipantDto;
  accessToken: string;
  created: boolean;
}

const dataOf = <T>(response: { data: ApiResponse<T> }): T => response.data.data;

export const plannerApi = {
  async createPlanner(title: string) {
    const response = await apiClient.post<ApiResponse<{ planner: Planner; day: Day }>>(
      '/planners',
      { title }
    );
    return dataOf(response);
  },

  async getSnapshot(shareCode: string) {
    const response = await apiClient.get<ApiResponse<PlannerSnapshot>>(
      `/planners/by-code/${encodeURIComponent(shareCode)}`
    );
    return dataOf(response);
  },

  async createSession(shareCode: string, name: string, password: string) {
    const response = await apiClient.post<ApiResponse<AuthSessionResult>>('/auth/session', {
      shareCode,
      name,
      password,
    });
    return dataOf(response);
  },

  async getMe(token: string) {
    const response = await apiClient.get<ApiResponse<{ participant: ParticipantDto }>>(
      '/auth/me',
      authConfig(token)
    );
    return dataOf(response).participant;
  },

  async createDay(plannerId: string, token: string) {
    const response = await apiClient.post<ApiResponse<Day>>(
      `/planners/${plannerId}/days`,
      undefined,
      authConfig(token)
    );
    return dataOf(response);
  },

  async createSchedule(
    plannerId: string,
    dayId: string,
    input: CreateScheduleInput,
    token: string
  ) {
    const response = await apiClient.post<ApiResponse<Schedule>>(
      `/planners/${plannerId}/days/${dayId}/schedules`,
      input,
      authConfig(token)
    );
    return dataOf(response);
  },

  async updateSchedule(
    plannerId: string,
    scheduleId: string,
    input: UpdateScheduleInput,
    token: string
  ) {
    const response = await apiClient.patch<ApiResponse<Schedule>>(
      `/planners/${plannerId}/schedules/${scheduleId}`,
      input,
      authConfig(token)
    );
    return dataOf(response);
  },

  async deleteSchedule(plannerId: string, scheduleId: string, token: string) {
    const response = await apiClient.delete<ApiResponse<{ scheduleId: string }>>(
      `/planners/${plannerId}/schedules/${scheduleId}`,
      authConfig(token)
    );
    return dataOf(response);
  },

  async deletePlanner(plannerId: string, token: string) {
    const response = await apiClient.delete<
      ApiResponse<{ plannerId: string; deletedAt: string }>
    >(`/planners/${plannerId}`, authConfig(token));
    return dataOf(response);
  },
};
