import type { Request, Response } from 'express';
import { plannerService } from '../services/plannerService';
import { socketEvents } from '../sockets/socketGateway';
import type { CreatePlannerInput } from '../validation/schemas';

export const plannerController = {
  async create(req: Request, res: Response) {
    const { title } = req.body as CreatePlannerInput;
    const data = await plannerService.create(title);
    res.status(201).json({
      success: true,
      data,
      message: '플래너가 생성되었습니다.',
    });
  },

  async getSnapshot(req: Request, res: Response) {
    const data = await plannerService.getSnapshot(req.params.shareCode);
    res.status(200).json({
      success: true,
      data,
      message: '플래너를 조회했습니다.',
    });
  },

  async delete(req: Request, res: Response) {
    const data = await plannerService.softDelete(req.params.plannerId);
    socketEvents.plannerDeleted(data.plannerId, data.deletedAt);
    res.status(200).json({
      success: true,
      data,
      message: '플래너가 삭제되었습니다.',
    });
  },
};
