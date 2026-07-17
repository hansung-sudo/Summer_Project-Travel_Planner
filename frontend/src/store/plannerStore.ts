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
  simulationActive: boolean;
  
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
  startSimulation: () => void;
  stopSimulation: () => void;
  receiveSimulatedMessage: (name: string, text: string) => void;
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

let simulationInterval: number | null = null;

export const usePlannerStore = create<PlannerState>((set, get) => ({
  planner: null,
  participants: [],
  currentUser: null,
  days: [],
  schedules: [],
  messages: [],
  activeDayId: null,
  showGridLines: true,
  simulationActive: false,

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
      simulationActive: false
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
      simulationActive: false
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
  },

  startSimulation: () => {
    const { simulationActive, planner } = get();
    if (simulationActive || !planner) return;

    set({ simulationActive: true });

    // Define simulated team members
    const mockMembers = [
      { name: '김민수', color: '#0d9488' },
      { name: '이지원', color: '#d97706' },
      { name: '박태현', color: '#db2777' }
    ];

    const mockLocations = [
      { name: '성산일출봉', lat: 33.4586000, lng: 126.9426000, content: '일출 구경 & 하이킹' },
      { name: '협재해수욕장', lat: 33.3938000, lng: 126.2396000, content: '모래사장 산책 및 카페 방문' },
      { name: '한라산 국립공원', lat: 33.3617000, lng: 126.5292000, content: '등산 준비!' },
      { name: '동문시장', lat: 33.5126000, lng: 126.5284000, content: '야시장에서 길거리 음식 먹기' },
      { name: '오설록 티뮤지엄', lat: 33.3059000, lng: 126.2894000, content: '녹차 아이스크림 시식' }
    ];

    const mockChats = [
      '일정 대충 짰는데 어때요?',
      '원형 시간표 보니까 14시쯤 비어있던데 동문시장 갈까요?',
      '성산일출봉 가려면 아침 일찍 가야 해요! 07시로 수정해볼게요.',
      '협재 바다 진짜 예쁘겠다 ㅠㅠ',
      '전 2일차 아침에 늦잠 자고 싶어요 ㅋㅋㅋ',
      '시간표 눈금 보니까 일정 겹치는 거 경고 뜨네요!',
      '오설록 티뮤지엄 근처 맛집 아시는 분?',
    ];

    let step = 0;
    simulationInterval = window.setInterval(() => {
      const { planner: currentPlanner, participants, activeDayId } = get();
      if (!currentPlanner || currentPlanner.isDeleted) {
        if (simulationInterval) clearInterval(simulationInterval);
        return;
      }

      // Add a simulated participant if not already in participants list (up to 3)
      const currentSimulated = participants.filter(p => mockMembers.some(m => m.name === p.name));
      if (currentSimulated.length < mockMembers.length && Math.random() < 0.3) {
        const nextToJoin = mockMembers[currentSimulated.length];
        const newPart: Participant = {
          id: `sim-${nextToJoin.name}`,
          plannerId: currentPlanner.id,
          name: nextToJoin.name,
          role: 'member',
          color: nextToJoin.color,
          joinedAt: new Date().toISOString()
        };
        
        set({
          participants: [...participants, newPart],
          messages: [
            ...get().messages,
            {
              id: Math.random().toString(36).substring(2, 10),
              plannerId: currentPlanner.id,
              participantId: 'system',
              participantName: 'TripSync 🧭',
              content: `👋 ${nextToJoin.name}님이 플래너에 참여하셨습니다. (멤버)`,
              createdAt: new Date().toISOString()
            }
          ]
        });
        return;
      }

      // Perform a random action: send a message or add a schedule
      if (participants.length > 1) {
        const randomMember = participants.find(p => p.id.startsWith('sim-'));
        if (!randomMember) return;

        const actionRoll = Math.random();
        if (actionRoll < 0.6) {
          // Chat action
          const chatText = mockChats[step % mockChats.length];
          step++;
          
          set({
            messages: [
              ...get().messages,
              {
                id: Math.random().toString(36).substring(2, 10),
                plannerId: currentPlanner.id,
                participantId: randomMember.id,
                participantName: randomMember.name,
                content: chatText,
                createdAt: new Date().toISOString()
              }
            ]
          });
        } else if (actionRoll < 0.9 && activeDayId) {
          // Schedule action: Try to find a free slot or add a schedule
          const randomLoc = mockLocations[Math.floor(Math.random() * mockLocations.length)];
          // Find currently taken schedules for this day to avoid overlapping, or just pick a random time
          const startH = 10 + Math.floor(Math.random() * 8); // 10:00 to 18:00
          const duration = 1 + Math.floor(Math.random() * 2); // 1 to 2 hours
          const startStr = `${startH.toString().padStart(2, '0')}:00`;
          const endStr = `${(startH + duration).toString().padStart(2, '0')}:00`;

          const newSched: Schedule = {
            id: Math.random().toString(36).substring(2, 10),
            dayId: activeDayId,
            startTime: startStr,
            endTime: endStr,
            placeName: randomLoc.name,
            placeLat: randomLoc.lat,
            placeLng: randomLoc.lng,
            content: randomLoc.content,
            createdBy: randomMember.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          set({
            schedules: [...get().schedules, newSched],
            messages: [
              ...get().messages,
              {
                id: Math.random().toString(36).substring(2, 10),
                plannerId: currentPlanner.id,
                participantId: 'system',
                participantName: 'TripSync 🧭',
                content: `📌 ${randomMember.name}님이 [${randomLoc.name}] 일정을 추가했습니다. (${startStr} ~ ${endStr})`,
                createdAt: new Date().toISOString()
              }
            ]
          });
        }
      }
    }, 8000); // Trigger action every 8 seconds
  },

  stopSimulation: () => {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
    set({ simulationActive: false });
  },

  receiveSimulatedMessage: (name, text) => {
    const { planner, messages } = get();
    if (!planner) return;
    
    const newMsg: Message = {
      id: Math.random().toString(36).substring(2, 10),
      plannerId: planner.id,
      participantId: 'system-agent',
      participantName: name,
      content: text,
      createdAt: new Date().toISOString()
    };
    
    set({ messages: [...messages, newMsg] });
  }
}));
