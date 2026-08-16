import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { authService } from '../services/authService';
import { messageService } from '../services/messageService';
import { plannerService } from '../services/plannerService';
import type {
  DayDto,
  ParticipantDto,
  ScheduleDto,
  SocketAck,
} from '../types/api';
import type { AppSocketServer } from '../types/socket';
import { AppError } from '../utils/appError';
import { messagePayloadSchema } from '../validation/schemas';

let io: AppSocketServer | undefined;

const roomName = (plannerId: string) => `planner:${plannerId}`;

const socketError = (error: unknown): Error => {
  const appError = error instanceof AppError
    ? error
    : new AppError(500, 'INTERNAL_SERVER_ERROR', '실시간 연결을 처리할 수 없습니다.');
  const result = new Error(appError.message) as Error & { data?: { code: string } };
  result.data = { code: appError.code };
  return result;
};

const acknowledgeError = (error: unknown): SocketAck => {
  if (error instanceof AppError) {
    return { success: false, message: error.message, code: error.code };
  }
  return {
    success: false,
    message: '메시지를 전송할 수 없습니다.',
    code: 'INTERNAL_SERVER_ERROR',
  };
};

export const initializeSocketServer = (httpServer: HttpServer): AppSocketServer => {
  io = new Server(httpServer, {
    cors: { origin: env.clientOrigins, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const rawShareCode = socket.handshake.auth.shareCode;
      if (typeof rawShareCode !== 'string') {
        throw new AppError(400, 'VALIDATION_ERROR', '공유 코드가 필요합니다.');
      }

      const shareCode = rawShareCode.trim().toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(shareCode)) {
        throw new AppError(400, 'VALIDATION_ERROR', '공유 코드 형식이 올바르지 않습니다.');
      }

      const plannerId = await plannerService.getActivePlannerId(shareCode);
      const rawToken = socket.handshake.auth.token;
      if (rawToken !== undefined && typeof rawToken !== 'string') {
        throw new AppError(401, 'INVALID_TOKEN', '인증 토큰이 유효하지 않습니다.');
      }

      socket.data.plannerId = plannerId;
      if (rawToken !== undefined) {
        const { auth } = await authService.authenticateToken(rawToken, plannerId);
        socket.data.auth = auth;
      }
      next();
    } catch (error) {
      next(socketError(error));
    }
  });

  io.on('connection', (socket) => {
    socket.join(roomName(socket.data.plannerId));

    socket.on('message:send', async (payload, acknowledge) => {
      try {
        if (!socket.data.auth) {
          throw new AppError(401, 'AUTH_REQUIRED', '로그인 후 메시지를 보낼 수 있습니다.');
        }

        const parsed = messagePayloadSchema.safeParse(payload);
        if (!parsed.success) {
          throw new AppError(400, 'VALIDATION_ERROR', '메시지 형식이 올바르지 않습니다.');
        }

        const message = await messageService.create(socket.data.auth, parsed.data.content);
        io?.to(roomName(socket.data.plannerId)).emit('message:created', message);
        acknowledge?.({ success: true });
      } catch (error) {
        acknowledge?.(acknowledgeError(error));
      }
    });
  });

  return io;
};

const emitToPlanner = <Event extends keyof import('../types/socket').ServerToClientEvents>(
  plannerId: string,
  event: Event,
  ...args: Parameters<import('../types/socket').ServerToClientEvents[Event]>
) => {
  if (!io) return;
  io.to(roomName(plannerId)).emit(event, ...args);
};

export const socketEvents = {
  participantJoined: (plannerId: string, participant: ParticipantDto) =>
    emitToPlanner(plannerId, 'participant:joined', participant),
  dayCreated: (plannerId: string, day: DayDto) =>
    emitToPlanner(plannerId, 'day:created', day),
  scheduleCreated: (plannerId: string, schedule: ScheduleDto) =>
    emitToPlanner(plannerId, 'schedule:created', schedule),
  scheduleUpdated: (plannerId: string, schedule: ScheduleDto) =>
    emitToPlanner(plannerId, 'schedule:updated', schedule),
  scheduleDeleted: (plannerId: string, scheduleId: string) =>
    emitToPlanner(plannerId, 'schedule:deleted', { scheduleId }),
  plannerDeleted: (plannerId: string, deletedAt: string) => {
    emitToPlanner(plannerId, 'planner:deleted', { plannerId, deletedAt });
  },
};
