import type { Server, Socket } from 'socket.io';
import type {
  AuthContext,
  DayDto,
  MessageDto,
  ParticipantDto,
  ScheduleDto,
  SocketAck,
} from './api';

export interface ClientToServerEvents {
  'message:send': (payload: unknown, acknowledge?: (result: SocketAck) => void) => void;
}

export interface ServerToClientEvents {
  'participant:joined': (participant: ParticipantDto) => void;
  'day:created': (day: DayDto) => void;
  'schedule:created': (schedule: ScheduleDto) => void;
  'schedule:updated': (schedule: ScheduleDto) => void;
  'schedule:deleted': (payload: { scheduleId: string }) => void;
  'message:created': (message: MessageDto) => void;
  'planner:deleted': (payload: { plannerId: string; deletedAt: string }) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  plannerId: string;
  auth?: AuthContext;
}

export type AppSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
