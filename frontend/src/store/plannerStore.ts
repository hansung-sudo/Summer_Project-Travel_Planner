import { create } from 'zustand';
import type { Planner, Participant, Day, Schedule, Message } from '../types';

interface PlannerState {
  planner: Planner | null;
  participants: Participant[];
  currentUser: Participant | null;
  days: Day[];
  schedules: Schedule[];
  messages: Message[];
  activeDayId: string | null;
  showGridLines: boolean;

  // Actions
  createPlanner: (title: string) => string;
  loadPlanner: (shareCode: string) => boolean;
  joinPlanner: (name: string, role?: 'owner' | 'member') => Participant;
  logout: () => void;
  addDay: () => void;
  addSchedule: (scheduleData: Omit<Schedule, 'id' | 'dayId' | 'createdBy' | 'createdAt' | 'updatedAt'>) => void;
  updateSchedule: (schedule: Schedule) => void;
  deleteSchedule: (id: string) => void;
  deletePlanner: () => void;
  sendMessage: (content: string) => void;
  toggleGridLines: () => void;

}

// Predefined soft colors for participants
const PARTICIPANT_COLORS = [
  '#4f46e5', // Indigo
  '#0d9488', // Teal
  '#d97706', // Amber
  '#db2777', // Pink
  '#2563eb', // Blue
  '#7c3aed', // Violet
  '#059669', // Emerald
  '#dc2626', // Red
];

// Helper to load/save mock data in localStorage to support persistence
const getStoredPlanners = (): Record<string, {
  planner: Planner;
  participants: Participant[];
  days: Day[];
  schedules: Schedule[];
  messages: Message[];
}> => {
  try {
    const data = localStorage.getItem('tripsync_planners');
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
};

const saveStoredPlanner = (
  shareCode: string,
  data: {
    planner: Planner;
    participants: Participant[];
    days: Day[];
    schedules: Schedule[];
    messages: Message[];
  }
) => {
  try {
    const planners = getStoredPlanners();
    planners[shareCode] = data;
    localStorage.setItem('tripsync_planners', JSON.stringify(planners));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
};



export const usePlannerStore = create<PlannerState>((set, get) => ({
  planner: null,
  participants: [],
  currentUser: null,
  days: [],
  schedules: [],
  messages: [],
  activeDayId: null,
  showGridLines: true,

  createPlanner: (title: string) => {
    const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const plannerId = Math.random().toString(36).substring(2, 10);

    const newPlanner: Planner = {
      id: plannerId,
      title,
      shareCode,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };

    const firstDayId = Math.random().toString(36).substring(2, 10);
    const newDays: Day[] = [
      {
        id: firstDayId,
        plannerId,
        dayNumber: 1,
        label: '1일차',
      }
    ];

    const plannerData = {
      planner: newPlanner,
      participants: [],
      days: newDays,
      schedules: [],
      messages: [
        {
          id: 'welcome',
          plannerId,
          participantId: 'system',
          participantName: 'TripSync 🧭',
          content: `"${title}" 플래너가 생성되었습니다! 링크를 공유하여 팀원들을 초대해보세요.`,
          createdAt: new Date().toISOString(),
        }
      ],
    };

    saveStoredPlanner(shareCode, plannerData);

    set({
      planner: newPlanner,
      participants: [],
      currentUser: null,
      days: newDays,
      schedules: [],
      messages: plannerData.messages,
      activeDayId: firstDayId,
    });

    return shareCode;
  },

  loadPlanner: (shareCode: string) => {
    const planners = getStoredPlanners();
    const data = planners[shareCode];
    if (data && !data.planner.isDeleted) {
      set({
        planner: data.planner,
        participants: data.participants,
        days: data.days,
        schedules: data.schedules,
        messages: data.messages,
        activeDayId: data.days.length > 0 ? data.days[0].id : null,
        currentUser: null, // Reset login on load
      });
      return true;
    }
    return false;
  },

  joinPlanner: (name: string, role?: 'owner' | 'member') => {
    const { planner, participants } = get();
    if (!planner) throw new Error('No planner loaded');

    // Check if participant with the same name already exists
    const existing = participants.find(p => p.name.trim() === name.trim());
    if (existing) {
      // Just log in as existing user (or simulate session restore)
      set({ currentUser: existing });
      return existing;
    }

    const assignedRole = role || (participants.length === 0 ? 'owner' : 'member');
    const color = PARTICIPANT_COLORS[participants.length % PARTICIPANT_COLORS.length];

    const newParticipant: Participant = {
      id: Math.random().toString(36).substring(2, 10),
      plannerId: planner.id,
      name,
      role: assignedRole,
      color,
      joinedAt: new Date().toISOString(),
    };

    const updatedParticipants = [...participants, newParticipant];

    const updatedMessages = [
      ...get().messages,
      {
        id: Math.random().toString(36).substring(2, 10),
        plannerId: planner.id,
        participantId: 'system',
        participantName: 'TripSync 🧭',
        content: `👋 ${name}님이 플래너에 참여하셨습니다. (${assignedRole === 'owner' ? '방장' : '멤버'})`,
        createdAt: new Date().toISOString(),
      }
    ];

    set({
      participants: updatedParticipants,
      currentUser: newParticipant,
      messages: updatedMessages
    });

    // Save changes
    const state = get();
    saveStoredPlanner(planner.shareCode, {
      planner: state.planner!,
      participants: state.participants,
      days: state.days,
      schedules: state.schedules,
      messages: state.messages,
    });

    return newParticipant;
  },

  logout: () => {
    set({ currentUser: null });
  },

  addDay: () => {
    const { planner, days } = get();
    if (!planner) return;

    const nextDayNum = days.length + 1;
    const newDay: Day = {
      id: Math.random().toString(36).substring(2, 10),
      plannerId: planner.id,
      dayNumber: nextDayNum,
      label: `${nextDayNum}일차`,
    };

    const updatedDays = [...days, newDay];

    set({
      days: updatedDays,
      activeDayId: get().activeDayId || newDay.id
    });

    const state = get();
    saveStoredPlanner(planner.shareCode, {
      planner: state.planner!,
      participants: state.participants,
      days: state.days,
      schedules: state.schedules,
      messages: state.messages,
    });
  },

  addSchedule: (scheduleData) => {
    const { planner, activeDayId, currentUser, schedules } = get();
    if (!planner || !activeDayId || !currentUser) return;

    const newSchedule: Schedule = {
      ...scheduleData,
      id: Math.random().toString(36).substring(2, 10),
      dayId: activeDayId,
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedSchedules = [...schedules, newSchedule];

    set({ schedules: updatedSchedules });

    const state = get();
    saveStoredPlanner(planner.shareCode, {
      planner: state.planner!,
      participants: state.participants,
      days: state.days,
      schedules: state.schedules,
      messages: state.messages,
    });
  },

  updateSchedule: (updated) => {
    const { planner, schedules } = get();
    if (!planner) return;

    const updatedSchedules = schedules.map(s =>
      s.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : s
    );

    set({ schedules: updatedSchedules });

    const state = get();
    saveStoredPlanner(planner.shareCode, {
      planner: state.planner!,
      participants: state.participants,
      days: state.days,
      schedules: state.schedules,
      messages: state.messages,
    });
  },

  deleteSchedule: (id) => {
    const { planner, schedules } = get();
    if (!planner) return;

    const updatedSchedules = schedules.filter(s => s.id !== id);

    set({ schedules: updatedSchedules });

    const state = get();
    saveStoredPlanner(planner.shareCode, {
      planner: state.planner!,
      participants: state.participants,
      days: state.days,
      schedules: state.schedules,
      messages: state.messages,
    });
  },

  deletePlanner: () => {
    const { planner } = get();
    if (!planner) return;

    const planners = getStoredPlanners();
    if (planners[planner.shareCode]) {
      planners[planner.shareCode].planner.isDeleted = true;
      planners[planner.shareCode].planner.deletedAt = new Date().toISOString();
      localStorage.setItem('tripsync_planners', JSON.stringify(planners));
    }

    set({
      planner: {
        ...planner,
        isDeleted: true,
      },
      currentUser: null,
    });
  },

  sendMessage: (content) => {
    const { planner, currentUser, messages } = get();
    if (!planner || !currentUser) return;

    const newMessage: Message = {
      id: Math.random().toString(36).substring(2, 10),
      plannerId: planner.id,
      participantId: currentUser.id,
      participantName: currentUser.name,
      content,
      createdAt: new Date().toISOString(),
    };

    const updatedMessages = [...messages, newMessage];
    set({ messages: updatedMessages });

    const state = get();
    saveStoredPlanner(planner.shareCode, {
      planner: state.planner!,
      participants: state.participants,
      days: state.days,
      schedules: state.schedules,
      messages: state.messages,
    });
  },

  toggleGridLines: () => {
    set(state => ({ showGridLines: !state.showGridLines }));
  }
}));
