import type { Request, Response } from 'express';
import { authService } from '../services/authService';
import { socketEvents } from '../sockets/socketGateway';
import type { AuthSessionInput } from '../validation/schemas';

export const authController = {
  async createSession(req: Request, res: Response) {
    const data = await authService.createSession(req.body as AuthSessionInput);
    if (data.created) {
      socketEvents.participantJoined(data.participant.plannerId, data.participant);
    }
    res.status(data.created ? 201 : 200).json({
      success: true,
      data,
      message: data.created ? '플래너에 참여했습니다.' : '로그인했습니다.',
    });
  },

  async me(req: Request, res: Response) {
    res.status(200).json({
      success: true,
      data: { participant: req.participant },
      message: '현재 사용자입니다.',
    });
  },
};
