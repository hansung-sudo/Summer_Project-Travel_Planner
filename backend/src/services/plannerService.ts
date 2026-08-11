import { randomInt } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import type { PlannerSnapshotDto } from '../types/api';
import { toDayDto, toMessageDto, toParticipantDto, toPlannerDto, toScheduleDto } from '../utils/dto';
import { AppError } from '../utils/appError';
import { isPrismaError } from '../utils/prismaError';

const SHARE_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const SHARE_CODE_LENGTH = 6;
const MAX_SHARE_CODE_ATTEMPTS = 5;

const createShareCode = (): string =>
  Array.from(
    { length: SHARE_CODE_LENGTH },
    () => SHARE_CODE_ALPHABET[randomInt(SHARE_CODE_ALPHABET.length)]
  ).join('');

export const plannerService = {
  async create(title: string) {
    for (let attempt = 0; attempt < MAX_SHARE_CODE_ATTEMPTS; attempt += 1) {
      const shareCode = createShareCode();

      try {
        const result = await prisma.$transaction(async (tx) => {
          const planner = await tx.planner.create({
            data: { title, share_code: shareCode },
          });
          const day = await tx.day.create({
            data: {
              planner_id: planner.id,
              day_number: 1,
              label: '1일차',
            },
          });
          return { planner, day };
        });

        return {
          planner: toPlannerDto(result.planner),
          day: toDayDto(result.day),
        };
      } catch (error) {
        if (isPrismaError(error, 'P2002')) {
          if (attempt < MAX_SHARE_CODE_ATTEMPTS - 1) continue;
          break;
        }
        throw error;
      }
    }

    throw new AppError(500, 'INTERNAL_SERVER_ERROR', '공유 코드를 생성할 수 없습니다.');
  },

  async getSnapshot(shareCode: string): Promise<PlannerSnapshotDto> {
    const planner = await prisma.planner.findUnique({
      where: { share_code: shareCode },
      include: {
        participants: { orderBy: { joined_at: 'asc' } },
        days: {
          orderBy: { day_number: 'asc' },
          include: {
            schedules: {
              orderBy: [{ start_time: 'asc' }, { created_at: 'asc' }],
            },
          },
        },
        messages: {
          take: 50,
          orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
          include: { participant: true },
        },
      },
    });

    if (!planner || planner.is_deleted) {
      throw new AppError(404, 'PLANNER_NOT_FOUND', '플래너를 찾을 수 없습니다.');
    }

    return {
      planner: toPlannerDto(planner),
      participants: planner.participants.map(toParticipantDto),
      days: planner.days.map(toDayDto),
      schedules: planner.days.flatMap((day) => day.schedules.map(toScheduleDto)),
      messages: [...planner.messages].reverse().map(toMessageDto),
    };
  },

  async getActivePlannerId(shareCode: string): Promise<string> {
    const planner = await prisma.planner.findUnique({
      where: { share_code: shareCode },
      select: { id: true, is_deleted: true },
    });
    if (!planner || planner.is_deleted) {
      throw new AppError(404, 'PLANNER_NOT_FOUND', '플래너를 찾을 수 없습니다.');
    }
    return planner.id;
  },

  async softDelete(plannerId: string) {
    const deletedAt = new Date();
    const result = await prisma.planner.updateMany({
      where: { id: plannerId, is_deleted: false },
      data: { is_deleted: true, deleted_at: deletedAt },
    });

    if (result.count === 0) {
      throw new AppError(404, 'PLANNER_NOT_FOUND', '플래너를 찾을 수 없습니다.');
    }

    return { plannerId, deletedAt: deletedAt.toISOString() };
  },
};
