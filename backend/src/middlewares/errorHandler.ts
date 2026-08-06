import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/appError';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      data: null,
      message: err.message,
      code: err.code,
      ...(err.details === undefined ? {} : { details: err.details }),
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        data: null,
        message: '요청한 데이터를 찾을 수 없습니다.',
        code: 'RESOURCE_NOT_FOUND',
      });
      return;
    }

    console.error('Unhandled Prisma error:', err);
    res.status(500).json({
      success: false,
      data: null,
      message: '데이터 처리 중 오류가 발생했습니다.',
      code: 'INTERNAL_SERVER_ERROR',
    });
    return;
  }

  console.error('Unhandled backend error:', err);
  res.status(500).json({
    success: false,
    data: null,
    message: '서버 내부 오류가 발생했습니다.',
    code: 'INTERNAL_SERVER_ERROR',
  });
};
