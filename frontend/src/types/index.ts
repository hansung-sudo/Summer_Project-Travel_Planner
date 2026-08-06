export interface Planner {
  id: string;
  title: string;
  shareCode: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
}

export interface ParticipantDto {
  id: string;
  plannerId: string;
  name: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface Participant extends ParticipantDto {
  color: string;
}

export interface Day {
  id: string;
  plannerId: string;
  dayNumber: number;
  label: string;
}

export interface Schedule {
  id: string;
  dayId: string;
  startTime: string;
  endTime: string;
  placeName: string | null;
  placeLat: number | null;
  placeLng: number | null;
  content: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  plannerId: string;
  participantId: string;
  participantName: string;
  content: string;
  createdAt: string;
}

export interface PlannerSnapshot {
  planner: Planner;
  participants: ParticipantDto[];
  days: Day[];
  schedules: Schedule[];
  messages: Message[];
}

export interface CreateScheduleInput {
  startTime: string;
  endTime: string;
  placeName?: string | null;
  placeLat?: number | null;
  placeLng?: number | null;
  content?: string | null;
}

export type UpdateScheduleInput = Partial<CreateScheduleInput>;

export interface ApiResponse<T> {
  success: true;
  data: T;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  message: string;
  code: string;
  details?: unknown;
}

export interface SocketAck {
  success: boolean;
  message?: string;
  code?: string;
}
