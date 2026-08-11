import { Prisma } from '@prisma/client';

export const isPrismaError = (
  error: unknown,
  ...codes: string[]
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError && codes.includes(error.code);

export const isRetryableTransactionError = (error: unknown): boolean =>
  isPrismaError(error, 'P2002', 'P2034');
