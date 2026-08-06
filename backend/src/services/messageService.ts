import { prisma } from '../config/db';
import type { AuthContext } from '../types/api';
import { AppError } from '../utils/appError';
import { toMessageDto } from '../utils/dto';

export const messageService = {
  async create(auth: AuthContext, content: string) {
    const participant = await prisma.participant.findFirst({
      where: {
        id: auth.participantId,
        planner_id: auth.plannerId,
        planner: { is_deleted: false },
      },
    });
    if (!participant) {
      throw new AppError(401, 'INVALID_TOKEN', '인증 정보가 유효하지 않습니다.');
    }

    const message = await prisma.message.create({
      data: {
        planner_id: auth.plannerId,
        participant_id: auth.participantId,
        content,
      },
      include: { participant: true },
    });

    return toMessageDto(message);
  },
};
