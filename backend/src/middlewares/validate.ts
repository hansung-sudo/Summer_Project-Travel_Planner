import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../utils/appError';

interface RequestSchemas {
  body?: ZodType;
  params?: ZodType;
}

export const validate = (schemas: RequestSchemas) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const issues: Array<{ path: string; message: string }> = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (result.success) {
        req.body = result.data;
      } else {
        issues.push(
          ...result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          }))
        );
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (result.success) {
        req.params = result.data as Request['params'];
      } else {
        issues.push(
          ...result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          }))
        );
      }
    }

    if (issues.length > 0) {
      next(new AppError(400, 'VALIDATION_ERROR', '입력값을 확인해 주세요.', issues));
      return;
    }

    next();
  };

export const validateBody = (schema: ZodType) => validate({ body: schema });
export const validateParams = (schema: ZodType) => validate({ params: schema });
