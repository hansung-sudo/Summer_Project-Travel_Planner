import { Router } from 'express';
import { scheduleController } from '../controllers/scheduleController';
import { requireAuth, requirePlannerScope } from '../middlewares/auth';
import { validateBody, validateParams } from '../middlewares/validate';
import {
  createScheduleBodySchema,
  createScheduleParamsSchema,
  scheduleParamsSchema,
  updateScheduleBodySchema,
} from '../validation/schemas';

const router = Router();

router.post(
  '/:plannerId/days/:dayId/schedules',
  validateParams(createScheduleParamsSchema),
  requireAuth,
  requirePlannerScope,
  validateBody(createScheduleBodySchema),
  scheduleController.create
);
router.patch(
  '/:plannerId/schedules/:scheduleId',
  validateParams(scheduleParamsSchema),
  requireAuth,
  requirePlannerScope,
  validateBody(updateScheduleBodySchema),
  scheduleController.update
);
router.delete(
  '/:plannerId/schedules/:scheduleId',
  validateParams(scheduleParamsSchema),
  requireAuth,
  requirePlannerScope,
  scheduleController.delete
);

export default router;
