import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../utils/appError';
import { toDayDto } from '../utils/dto';
import { isRetryableTransactionError } from '../utils/prismaError';

const MAX_TRANSACTION_ATTEMPTS = 3;

export const dayService = {
  async create(plannerId: string) {
    for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        const day = await prisma.$transaction(
          async (tx) => {
            const planner = await tx.planner.findFirst({
              where: { id: plannerId, is_deleted: false },
            });
            if (!planner) {
              throw new AppError(404, 'PLANNER_NOT_FOUND', '플래너를 찾을 수 없습니다.');
            }

            const current = await tx.day.aggregate({
              where: { planner_id: plannerId },
              _max: { day_number: true },
            });
            const dayNumber = (current._max.day_number ?? 0) + 1;

            return tx.day.create({
              data: {
                planner_id: plannerId,
                day_number: dayNumber,
                label: `${dayNumber}일차`,
              },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );

        return toDayDto(day);
      } catch (error) {
        if (
          isRetryableTransactionError(error) &&
          attempt < MAX_TRANSACTION_ATTEMPTS - 1
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new AppError(500, 'INTERNAL_SERVER_ERROR', '일차를 생성할 수 없습니다.');
  },
};
