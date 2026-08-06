export type ParticipantRole = 'owner' | 'member';

export interface AuthContext {
  participantId: string;
  plannerId: string;
  role: ParticipantRole;
}

export interface PlannerDto {
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
  role: ParticipantRole;
  joinedAt: string;
}

export interface DayDto {
  id: string;
  plannerId: string;
  dayNumber: number;
  label: string;
}

export interface ScheduleDto {
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

export interface MessageDto {
  id: string;
  plannerId: string;
  participantId: string;
  participantName: string;
  content: string;
  createdAt: string;
}

export interface PlannerSnapshotDto {
  planner: PlannerDto;
  participants: ParticipantDto[];
  days: DayDto[];
  schedules: ScheduleDto[];
  messages: MessageDto[];
}

export interface SocketAck {
  success: boolean;
  message?: string;
  code?: string;
}
