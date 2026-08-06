import type { Request, Response } from 'express';
import { scheduleService } from '../services/scheduleService';
import { socketEvents } from '../sockets/socketGateway';
import type { CreateScheduleInput, UpdateScheduleInput } from '../validation/schemas';

export const scheduleController = {
  async create(req: Request, res: Response) {
    const schedule = await scheduleService.create(
      req.params.plannerId,
      req.params.dayId,
      req.auth!.participantId,
      req.body as CreateScheduleInput
    );
    socketEvents.scheduleCreated(req.params.plannerId, schedule);
    res.status(201).json({
      success: true,
      data: schedule,
      message: '일정이 생성되었습니다.',
    });
  },

  async update(req: Request, res: Response) {
    const schedule = await scheduleService.update(
      req.params.plannerId,
      req.params.scheduleId,
      req.body as UpdateScheduleInput
    );
    socketEvents.scheduleUpdated(req.params.plannerId, schedule);
    res.status(200).json({
      success: true,
      data: schedule,
      message: '일정이 수정되었습니다.',
    });
  },

  async delete(req: Request, res: Response) {
    const data = await scheduleService.delete(
      req.params.plannerId,
      req.params.scheduleId
    );
    socketEvents.scheduleDeleted(req.params.plannerId, data.scheduleId);
    res.status(200).json({
      success: true,
      data,
      message: '일정이 삭제되었습니다.',
    });
  },
};
