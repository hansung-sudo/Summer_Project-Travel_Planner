import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/appError';

export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(404, 'RESOURCE_NOT_FOUND', `${req.method} ${req.path} 경로가 없습니다.`));
};
