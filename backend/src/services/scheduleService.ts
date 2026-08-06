import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import type { CreateScheduleInput, UpdateScheduleInput } from '../validation/schemas';
import { AppError } from '../utils/appError';
import { toScheduleDto } from '../utils/dto';
import { dateToTimeString, timeStringToDate } from '../utils/time';

const normalizeText = (value: string | null | undefined): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value.trim() === '' ? null : value.trim();
};

const assertScheduleBelongsToPlanner = async (scheduleId: string, plannerId: string) => {
  const schedule = await prisma.schedule.findFirst({
    where: {
      id: scheduleId,
      day: {
        planner_id: plannerId,
        planner: { is_deleted: false },
      },
    },
  });

  if (!schedule) {
    throw new AppError(404, 'RESOURCE_NOT_FOUND', '일정을 찾을 수 없습니다.');
  }

  return schedule;
};

export const scheduleService = {
  async create(
    plannerId: string,
    dayId: string,
    participantId: string,
    input: CreateScheduleInput
  ) {
    const day = await prisma.day.findFirst({
      where: {
        id: dayId,
        planner_id: plannerId,
        planner: { is_deleted: false },
      },
    });
    if (!day) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', '일차를 찾을 수 없습니다.');
    }

    const schedule = await prisma.schedule.create({
      data: {
        day_id: dayId,
        start_time: timeStringToDate(input.startTime),
        end_time: timeStringToDate(input.endTime),
        place_name: normalizeText(input.placeName) ?? null,
        place_lat: input.placeLat ?? null,
        place_lng: input.placeLng ?? null,
        content: normalizeText(input.content) ?? null,
        created_by: participantId,
      },
    });

    return toScheduleDto(schedule);
  },

  async update(plannerId: string, scheduleId: string, input: UpdateScheduleInput) {
    const current = await assertScheduleBelongsToPlanner(scheduleId, plannerId);
    const startTime = input.startTime ?? dateToTimeString(current.start_time);
    const endTime = input.endTime ?? dateToTimeString(current.end_time);

    if (startTime === endTime) {
      throw new AppError(400, 'VALIDATION_ERROR', '시작 시간과 종료 시간은 달라야 합니다.');
    }

    const data: Prisma.ScheduleUpdateInput = {};
    if (input.startTime !== undefined) data.start_time = timeStringToDate(input.startTime);
    if (input.endTime !== undefined) data.end_time = timeStringToDate(input.endTime);
    if (input.placeName !== undefined) data.place_name = normalizeText(input.placeName) ?? null;
    if (input.placeLat !== undefined) data.place_lat = input.placeLat;
    if (input.placeLng !== undefined) data.place_lng = input.placeLng;
    if (input.content !== undefined) data.content = normalizeText(input.content) ?? null;

    const schedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data,
    });

    return toScheduleDto(schedule);
  },

  async delete(plannerId: string, scheduleId: string) {
    await assertScheduleBelongsToPlanner(scheduleId, plannerId);
    await prisma.schedule.delete({ where: { id: scheduleId } });
    return { scheduleId };
  },
};
