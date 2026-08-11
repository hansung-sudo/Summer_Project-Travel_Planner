import type { Request, Response } from 'express';
import { dayService } from '../services/dayService';
import { socketEvents } from '../sockets/socketGateway';

export const dayController = {
  async create(req: Request, res: Response) {
    const day = await dayService.create(req.params.plannerId);
    socketEvents.dayCreated(req.params.plannerId, day);
    res.status(201).json({
      success: true,
      data: day,
      message: '일차가 추가되었습니다.',
    });
  },
};
