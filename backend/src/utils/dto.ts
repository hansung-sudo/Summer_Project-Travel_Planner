import type {
  Day,
  Message,
  Participant,
  Planner,
  Schedule,
} from '@prisma/client';
import type {
  DayDto,
  MessageDto,
  ParticipantDto,
  PlannerDto,
  ScheduleDto,
} from '../types/api';
import { dateToTimeString } from './time';

export const toPlannerDto = (planner: Planner): PlannerDto => ({
  id: planner.id,
  title: planner.title,
  shareCode: planner.share_code,
  isDeleted: planner.is_deleted,
  deletedAt: planner.deleted_at?.toISOString() ?? null,
  createdAt: planner.created_at.toISOString(),
});

export const toParticipantDto = (participant: Participant): ParticipantDto => ({
  id: participant.id,
  plannerId: participant.planner_id,
  name: participant.name,
  role: participant.role,
  joinedAt: participant.joined_at.toISOString(),
});

export const toDayDto = (day: Day): DayDto => ({
  id: day.id,
  plannerId: day.planner_id,
  dayNumber: day.day_number,
  label: day.label,
});

export const toScheduleDto = (schedule: Schedule): ScheduleDto => ({
  id: schedule.id,
  dayId: schedule.day_id,
  startTime: dateToTimeString(schedule.start_time),
  endTime: dateToTimeString(schedule.end_time),
  placeName: schedule.place_name,
  placeLat: schedule.place_lat === null ? null : Number(schedule.place_lat),
  placeLng: schedule.place_lng === null ? null : Number(schedule.place_lng),
  content: schedule.content,
  createdBy: schedule.created_by,
  createdAt: schedule.created_at.toISOString(),
  updatedAt: schedule.updated_at.toISOString(),
});

export const toMessageDto = (
  message: Message & { participant: Participant }
): MessageDto => ({
  id: message.id,
  plannerId: message.planner_id,
  participantId: message.participant_id,
  participantName: message.participant.name,
  content: message.content,
  createdAt: message.created_at.toISOString(),
});
