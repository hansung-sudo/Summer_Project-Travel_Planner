import { create } from 'zustand';
import { ApiRequestError, getRequestErrorMessage } from '../api/client';
import { plannerApi } from '../api/plannerApi';
import { createPlannerSocket, type PlannerSocket } from '../socket/plannerSocket';
import type {
  CreateScheduleInput,
  Day,
  Message,
  Participant,
  ParticipantDto,
  Planner,
  PlannerSnapshot,
  Schedule,
  UpdateScheduleInput,
} from '../types';

interface PlannerState {
  planner: Planner | null;
  participants: Participant[];
  currentUser: Participant | null;
  days: Day[];
  schedules: Schedule[];
  messages: Message[];
  activeDayId: string | null;
  showGridLines: boolean;
  isLoading: boolean;
  error: string | null;
  socketStatus: 'disconnected' | 'connecting' | 'connected';

  createPlanner: (title: string) => Promise<string>;
  loadPlanner: (shareCode: string) => Promise<boolean>;
  unloadPlanner: () => void;
  joinPlanner: (name: string, password: string) => Promise<Participant>;
  logout: () => void;
  addDay: () => Promise<Day>;
  addSchedule: (input: CreateScheduleInput) => Promise<Schedule>;
  updateSchedule: (
    scheduleId: string,
    input: UpdateScheduleInput
  ) => Promise<Schedule>;
  deleteSchedule: (scheduleId: string) => Promise<void>;
  deletePlanner: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  toggleGridLines: () => void;
}

const PARTICIPANT_COLORS = [
  '#4f46e5',
  '#0d9488',
  '#d97706',
  '#db2777',
  '#2563eb',
  '#7c3aed',
  '#059669',
  '#dc2626',
];

const participantColor = (participantId: string): string => {
  let hash = 0;
  for (const character of participantId) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }
  return PARTICIPANT_COLORS[Math.abs(hash) % PARTICIPANT_COLORS.length];
};

const toParticipant = (participant: ParticipantDto): Participant => ({
  ...participant,
  color: participantColor(participant.id),
});

const upsertById = <T extends { id: string }>(items: T[], item: T): T[] => {
  const index = items.findIndex((current) => current.id === item.id);
  if (index < 0) return [...items, item];
  const next = [...items];
  next[index] = item;
  return next;
};

const tokenKey = (shareCode: string) => `tripsync_token_${shareCode}`;

const readToken = (shareCode: string): string | null => {
  try {
    return localStorage.getItem(tokenKey(shareCode));
  } catch {
    return null;
  }
};

const writeToken = (shareCode: string, token: string) => {
  try {
    localStorage.setItem(tokenKey(shareCode), token);
  } catch {
    // The current session still works even if persistence is unavailable.
  }
};

const removeToken = (shareCode: string) => {
  try {
    localStorage.removeItem(tokenKey(shareCode));
  } catch {
    // Ignore unavailable storage.
  }
};

const welcomeMessage = (planner: Planner): Message => ({
  id: `system:welcome:${planner.id}`,
  plannerId: planner.id,
  participantId: 'system',
  participantName: 'TripSync 🧭',
  content: `"${planner.title}" 플래너가 생성되었습니다! 링크를 공유하여 팀원들을 초대해보세요.`,
  createdAt: planner.createdAt,
});

const joinedMessage = (participant: Participant): Message => ({
  id: `system:joined:${participant.id}`,
  plannerId: participant.plannerId,
  participantId: 'system',
  participantName: 'TripSync 🧭',
  content: `👋 ${participant.name}님이 플래너에 참여하셨습니다. (${participant.role === 'owner' ? '방장' : '멤버'})`,
  createdAt: participant.joinedAt,
});

const sortByCreatedAt = <T extends { createdAt: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

let plannerSocket: PlannerSocket | null = null;
let loadSequence = 0;

export const usePlannerStore = create<PlannerState>((set, get) => {
  const disconnectSocket = () => {
    plannerSocket?.removeAllListeners();
    plannerSocket?.disconnect();
    plannerSocket = null;
    set({ socketStatus: 'disconnected' });
  };

  const applySnapshot = (snapshot: PlannerSnapshot, preserveSystemMessages: boolean) => {
    const previousSystemMessages = preserveSystemMessages
      ? get().messages.filter(
          (message) =>
            message.participantId === 'system' &&
            message.plannerId === snapshot.planner.id
        )
      : [];
    const messages = sortByCreatedAt([
      ...previousSystemMessages,
      welcomeMessage(snapshot.planner),
      ...snapshot.messages,
    ].reduce<Message[]>((result, message) => upsertById(result, message), []));

    const participants = snapshot.participants.map(toParticipant);
    const currentUser = get().currentUser;

    set({
      planner: snapshot.planner,
      participants,
      days: [...snapshot.days].sort((a, b) => a.dayNumber - b.dayNumber),
      schedules: snapshot.schedules,
      messages,
      activeDayId:
        snapshot.days.some((day) => day.id === get().activeDayId)
          ? get().activeDayId
          : snapshot.days[0]?.id ?? null,
      currentUser: currentUser
        ? participants.find((participant) => participant.id === currentUser.id) ?? null
        : null,
    });
  };

  const refreshSnapshot = async (shareCode: string) => {
    try {
      const snapshot = await plannerApi.getSnapshot(shareCode);
      if (get().planner?.shareCode === snapshot.planner.shareCode) {
        applySnapshot(snapshot, true);
      }
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'PLANNER_NOT_FOUND') {
        const planner = get().planner;
        if (planner) {
          set({
            planner: { ...planner, isDeleted: true },
            currentUser: null,
          });
        }
      }
    }
  };

  const connectSocket = (shareCode: string, token?: string) => {
    disconnectSocket();
    const socket = createPlannerSocket(shareCode, token);
    plannerSocket = socket;
    set({ socketStatus: 'connecting' });

    socket.on('connect', () => set({ socketStatus: 'connected' }));
    socket.on('disconnect', () => set({ socketStatus: 'disconnected' }));
    socket.io.on('reconnect', () => void refreshSnapshot(shareCode));

    socket.on('connect_error', (error) => {
      const code = (error as Error & { data?: { code?: string } }).data?.code;
      if (code === 'INVALID_TOKEN') {
        removeToken(shareCode);
        set({ currentUser: null });
        connectSocket(shareCode);
        return;
      }
      set({ socketStatus: 'disconnected', error: error.message });
    });

    socket.on('participant:joined', (participantDto) => {
      const participant = toParticipant(participantDto);
      set((state) => ({
        participants: upsertById(state.participants, participant).sort((a, b) =>
          a.joinedAt.localeCompare(b.joinedAt)
        ),
        messages: sortByCreatedAt(
          upsertById(state.messages, joinedMessage(participant))
        ),
      }));
    });

    socket.on('day:created', (day) => {
      set((state) => ({
        days: upsertById(state.days, day).sort((a, b) => a.dayNumber - b.dayNumber),
      }));
    });

    socket.on('schedule:created', (schedule) => {
      set((state) => ({ schedules: upsertById(state.schedules, schedule) }));
    });
    socket.on('schedule:updated', (schedule) => {
      set((state) => ({ schedules: upsertById(state.schedules, schedule) }));
    });
    socket.on('schedule:deleted', ({ scheduleId }) => {
      set((state) => ({
        schedules: state.schedules.filter((schedule) => schedule.id !== scheduleId),
      }));
    });
    socket.on('message:created', (message) => {
      set((state) => ({
        messages: sortByCreatedAt(upsertById(state.messages, message)),
      }));
    });
    socket.on('planner:deleted', ({ deletedAt }) => {
      const planner = get().planner;
      if (!planner) return;
      removeToken(planner.shareCode);
      set({
        planner: { ...planner, isDeleted: true, deletedAt },
        currentUser: null,
      });
      disconnectSocket();
    });

    socket.connect();
  };

  const requireAuthenticatedPlanner = () => {
    const planner = get().planner;
    if (!planner || !get().currentUser) {
      throw new ApiRequestError('로그인이 필요합니다.', 'AUTH_REQUIRED', 401);
    }
    const token = readToken(planner.shareCode);
    if (!token) {
      throw new ApiRequestError('로그인이 필요합니다.', 'AUTH_REQUIRED', 401);
    }
    return { planner, token };
  };

  return {
    planner: null,
    participants: [],
    currentUser: null,
    days: [],
    schedules: [],
    messages: [],
    activeDayId: null,
    showGridLines: true,
    isLoading: false,
    error: null,
    socketStatus: 'disconnected',

    createPlanner: async (title) => {
      set({ isLoading: true, error: null });
      try {
        const { planner, day } = await plannerApi.createPlanner(title);
        disconnectSocket();
        set({
          planner,
          participants: [],
          currentUser: null,
          days: [day],
          schedules: [],
          messages: [welcomeMessage(planner)],
          activeDayId: day.id,
          isLoading: false,
        });
        return planner.shareCode;
      } catch (error) {
        set({ isLoading: false, error: getRequestErrorMessage(error) });
        throw error;
      }
    },

    loadPlanner: async (rawShareCode) => {
      const shareCode = rawShareCode.trim().toUpperCase();
      const sequence = ++loadSequence;
      disconnectSocket();
      set({
        planner: null,
        participants: [],
        currentUser: null,
        days: [],
        schedules: [],
        messages: [],
        activeDayId: null,
        isLoading: true,
        error: null,
      });

      try {
        const snapshot = await plannerApi.getSnapshot(shareCode);
        if (sequence !== loadSequence) return false;
        applySnapshot(snapshot, false);

        const token = readToken(shareCode);
        if (token) {
          try {
            const participantDto = await plannerApi.getMe(token);
            if (
              sequence === loadSequence &&
              participantDto.plannerId === snapshot.planner.id
            ) {
              const participant = toParticipant(participantDto);
              set((state) => ({
                currentUser: participant,
                participants: upsertById(state.participants, participant),
              }));
            } else {
              removeToken(shareCode);
            }
          } catch {
            removeToken(shareCode);
          }
        }

        if (sequence !== loadSequence) return false;
        connectSocket(shareCode, readToken(shareCode) ?? undefined);
        set({ isLoading: false });
        return true;
      } catch (error) {
        if (sequence !== loadSequence) return false;
        set({ isLoading: false, error: getRequestErrorMessage(error) });
        return false;
      }
    },

    unloadPlanner: () => {
      loadSequence += 1;
      disconnectSocket();
      set({
        planner: null,
        participants: [],
        currentUser: null,
        days: [],
        schedules: [],
        messages: [],
        activeDayId: null,
        isLoading: false,
        error: null,
      });
    },

    joinPlanner: async (name, password) => {
      const planner = get().planner;
      if (!planner) throw new Error('플래너를 먼저 불러와야 합니다.');
      set({ error: null });
      try {
        const result = await plannerApi.createSession(
          planner.shareCode,
          name,
          password
        );
        writeToken(planner.shareCode, result.accessToken);
        const participant = toParticipant(result.participant);
        set((state) => ({
          currentUser: participant,
          participants: upsertById(state.participants, participant),
          messages: result.created
            ? sortByCreatedAt(upsertById(state.messages, joinedMessage(participant)))
            : state.messages,
        }));
        connectSocket(planner.shareCode, result.accessToken);
        return participant;
      } catch (error) {
        set({ error: getRequestErrorMessage(error) });
        throw error;
      }
    },

    logout: () => {
      const planner = get().planner;
      if (!planner) return;
      removeToken(planner.shareCode);
      set({ currentUser: null, error: null });
      connectSocket(planner.shareCode);
    },

    addDay: async () => {
      const { planner, token } = requireAuthenticatedPlanner();
      try {
        const day = await plannerApi.createDay(planner.id, token);
        set((state) => ({
          days: upsertById(state.days, day).sort((a, b) => a.dayNumber - b.dayNumber),
        }));
        return day;
      } catch (error) {
        set({ error: getRequestErrorMessage(error) });
        throw error;
      }
    },

    addSchedule: async (input) => {
      const { planner, token } = requireAuthenticatedPlanner();
      const dayId = get().activeDayId;
      if (!dayId) throw new Error('일차를 선택해 주세요.');
      try {
        const schedule = await plannerApi.createSchedule(
          planner.id,
          dayId,
          input,
          token
        );
        set((state) => ({ schedules: upsertById(state.schedules, schedule) }));
        return schedule;
      } catch (error) {
        set({ error: getRequestErrorMessage(error) });
        throw error;
      }
    },

    updateSchedule: async (scheduleId, input) => {
      const { planner, token } = requireAuthenticatedPlanner();
      try {
        const schedule = await plannerApi.updateSchedule(
          planner.id,
          scheduleId,
          input,
          token
        );
        set((state) => ({ schedules: upsertById(state.schedules, schedule) }));
        return schedule;
      } catch (error) {
        set({ error: getRequestErrorMessage(error) });
        throw error;
      }
    },

    deleteSchedule: async (scheduleId) => {
      const { planner, token } = requireAuthenticatedPlanner();
      try {
        await plannerApi.deleteSchedule(planner.id, scheduleId, token);
        set((state) => ({
          schedules: state.schedules.filter((schedule) => schedule.id !== scheduleId),
        }));
      } catch (error) {
        set({ error: getRequestErrorMessage(error) });
        throw error;
      }
    },

    deletePlanner: async () => {
      const { planner, token } = requireAuthenticatedPlanner();
      try {
        const result = await plannerApi.deletePlanner(planner.id, token);
        removeToken(planner.shareCode);
        set({
          planner: { ...planner, isDeleted: true, deletedAt: result.deletedAt },
          currentUser: null,
        });
        disconnectSocket();
      } catch (error) {
        set({ error: getRequestErrorMessage(error) });
        throw error;
      }
    },

    sendMessage: async (content) => {
      requireAuthenticatedPlanner();
      const socket = plannerSocket;
      if (!socket?.connected) {
        throw new Error('실시간 서버에 연결되어 있지 않습니다.');
      }

      await new Promise<void>((resolve, reject) => {
        const timeoutId = window.setTimeout(
          () => reject(new Error('메시지 전송 시간이 초과되었습니다.')),
          5_000
        );
        socket.emit('message:send', { content }, (acknowledge) => {
          window.clearTimeout(timeoutId);
          if (acknowledge.success) {
            resolve();
            return;
          }
          reject(new ApiRequestError(
            acknowledge.message || '메시지를 전송할 수 없습니다.',
            acknowledge.code
          ));
        });
      });
    },

    toggleGridLines: () => {
      set((state) => ({ showGridLines: !state.showGridLines }));
    },
  };
});
