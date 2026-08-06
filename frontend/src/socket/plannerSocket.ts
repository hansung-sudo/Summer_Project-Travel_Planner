import { io, type Socket } from 'socket.io-client';
import { serverUrl } from '../api/client';
import type { Day, Message, ParticipantDto, Schedule, SocketAck } from '../types';

interface ServerToClientEvents {
  'participant:joined': (participant: ParticipantDto) => void;
  'day:created': (day: Day) => void;
  'schedule:created': (schedule: Schedule) => void;
  'schedule:updated': (schedule: Schedule) => void;
  'schedule:deleted': (payload: { scheduleId: string }) => void;
  'message:created': (message: Message) => void;
  'planner:deleted': (payload: { plannerId: string; deletedAt: string }) => void;
}

interface ClientToServerEvents {
  'message:send': (
    payload: { content: string },
    acknowledge: (result: SocketAck) => void
  ) => void;
}

export type PlannerSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const createPlannerSocket = (
  shareCode: string,
  token?: string
): PlannerSocket =>
  io(serverUrl, {
    autoConnect: false,
    auth: { shareCode, token },
  });
