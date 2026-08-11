import { Prisma, Role, type Participant } from '@prisma/client';
import { prisma } from '../config/db';
import type { AuthContext } from '../types/api';
import type { AuthSessionInput } from '../validation/schemas';
import { AppError } from '../utils/appError';
import { toParticipantDto } from '../utils/dto';
import { signAccessToken, verifyAccessToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { isRetryableTransactionError } from '../utils/prismaError';

const MAX_TRANSACTION_ATTEMPTS = 3;

const createSessionResult = (participant: Participant, created: boolean) => {
  const auth: AuthContext = {
    participantId: participant.id,
    plannerId: participant.planner_id,
    role: participant.role,
  };

  return {
    participant: toParticipantDto(participant),
    accessToken: signAccessToken(auth),
    created,
  };
};

export const authService = {
  async createSession(input: AuthSessionInput) {
    const planner = await prisma.planner.findUnique({
      where: { share_code: input.shareCode },
    });

    if (!planner || planner.is_deleted) {
      throw new AppError(404, 'PLANNER_NOT_FOUND', '플래너를 찾을 수 없습니다.');
    }

    const existing = await prisma.participant.findUnique({
      where: {
        planner_id_name: { planner_id: planner.id, name: input.name },
      },
    });

    if (existing) {
      const passwordMatches = await verifyPassword(input.password, existing.password_hash);
      if (!passwordMatches) {
        throw new AppError(401, 'INVALID_CREDENTIALS', '이름 또는 비밀번호가 올바르지 않습니다.');
      }
      return createSessionResult(existing, false);
    }

    const passwordHash = await hashPassword(input.password);

    for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        const result = await prisma.$transaction(
          async (tx) => {
            const activePlanner = await tx.planner.findFirst({
              where: { id: planner.id, is_deleted: false },
            });
            if (!activePlanner) {
              throw new AppError(404, 'PLANNER_NOT_FOUND', '플래너를 찾을 수 없습니다.');
            }

            const concurrentParticipant = await tx.participant.findUnique({
              where: {
                planner_id_name: { planner_id: planner.id, name: input.name },
              },
            });
            if (concurrentParticipant) {
              return { participant: concurrentParticipant, created: false };
            }

            const participantCount = await tx.participant.count({
              where: { planner_id: planner.id },
            });
            const participant = await tx.participant.create({
              data: {
                planner_id: planner.id,
                name: input.name,
                password_hash: passwordHash,
                role: participantCount === 0 ? Role.owner : Role.member,
              },
            });

            return { participant, created: true };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );

        if (!result.created) {
          const passwordMatches = await verifyPassword(
            input.password,
            result.participant.password_hash
          );
          if (!passwordMatches) {
            throw new AppError(
              401,
              'INVALID_CREDENTIALS',
              '이름 또는 비밀번호가 올바르지 않습니다.'
            );
          }
        }

        return createSessionResult(result.participant, result.created);
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

    throw new AppError(500, 'INTERNAL_SERVER_ERROR', '참여자 정보를 처리할 수 없습니다.');
  },

  async authenticateToken(token: string, expectedPlannerId?: string) {
    const tokenAuth = verifyAccessToken(token);
    if (expectedPlannerId && tokenAuth.plannerId !== expectedPlannerId) {
      throw new AppError(403, 'PLANNER_SCOPE_MISMATCH', '다른 플래너의 토큰입니다.');
    }

    const participant = await prisma.participant.findUnique({
      where: { id: tokenAuth.participantId },
      include: { planner: true },
    });

    if (
      !participant ||
      participant.planner_id !== tokenAuth.plannerId ||
      participant.planner.is_deleted
    ) {
      throw new AppError(401, 'INVALID_TOKEN', '인증 토큰이 유효하지 않습니다.');
    }

    const auth: AuthContext = {
      participantId: participant.id,
      plannerId: participant.planner_id,
      role: participant.role,
    };

    return { auth, participant: toParticipantDto(participant) };
  },
};
