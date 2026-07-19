export interface Planner {
  id: string;
  title: string;
  shareCode: string;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
}

export interface Participant {
  id: string;
  plannerId: string;
  name: string;
  role: 'owner' | 'member';
  color: string; // Used to color-code schedule entries in the circular timetable
  joinedAt: string;
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
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  placeName?: string;
  placeLat?: number;
  placeLng?: number;
  content?: string;
  createdBy: string; // Participant.id
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
