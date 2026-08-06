import type { NextFunction, Request, Response } from 'express';
import { authService } from '../services/authService';
import { AppError } from '../utils/appError';

const getBearerToken = (authorization?: string): string => {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new AppError(401, 'AUTH_REQUIRED', '인증이 필요합니다.');
  }
  return match[1];
};

export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const token = getBearerToken(req.headers.authorization);
  const { auth, participant } = await authService.authenticateToken(token);
  req.auth = auth;
  req.participant = participant;
  next();
};

export const requirePlannerScope = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.auth || req.auth.plannerId !== req.params.plannerId) {
    throw new AppError(403, 'PLANNER_SCOPE_MISMATCH', '다른 플래너에는 접근할 수 없습니다.');
  }
  next();
};

export const requireOwner = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (req.auth?.role !== 'owner') {
    throw new AppError(403, 'OWNER_REQUIRED', '플래너 소유자만 수행할 수 있습니다.');
  }
  next();
};
