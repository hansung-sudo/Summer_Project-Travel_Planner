import { Router } from 'express';
import { dayController } from '../controllers/dayController';
import { plannerController } from '../controllers/plannerController';
import { requireAuth, requireOwner, requirePlannerScope } from '../middlewares/auth';
import { validateBody, validateParams } from '../middlewares/validate';
import {
  createPlannerBodySchema,
  plannerIdParamsSchema,
  shareCodeParamsSchema,
} from '../validation/schemas';

const router = Router();

router.post('/', validateBody(createPlannerBodySchema), plannerController.create);
router.get(
  '/by-code/:shareCode',
  validateParams(shareCodeParamsSchema),
  plannerController.getSnapshot
);
router.post(
  '/:plannerId/days',
  validateParams(plannerIdParamsSchema),
  requireAuth,
  requirePlannerScope,
  dayController.create
);
router.delete(
  '/:plannerId',
  validateParams(plannerIdParamsSchema),
  requireAuth,
  requirePlannerScope,
  requireOwner,
  plannerController.delete
);

export default router;
