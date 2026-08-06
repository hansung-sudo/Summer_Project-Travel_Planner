import { Router } from 'express';
import { authController } from '../controllers/authController';
import { requireAuth } from '../middlewares/auth';
import { validateBody } from '../middlewares/validate';
import { authSessionBodySchema } from '../validation/schemas';

const router = Router();

router.post('/session', validateBody(authSessionBodySchema), authController.createSession);
router.get('/me', requireAuth, authController.me);

export default router;
