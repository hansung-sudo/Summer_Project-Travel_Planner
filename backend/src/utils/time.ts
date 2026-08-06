import { AppError } from './appError';

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const timeStringToDate = (value: string): Date => {
  if (!TIME_PATTERN.test(value)) {
    throw new AppError(400, 'VALIDATION_ERROR', '시간 형식은 HH:mm이어야 합니다.');
  }

  const [hours, minutes] = value.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));
};

export const dateToTimeString = (value: Date): string => {
  const hours = value.getUTCHours().toString().padStart(2, '0');
  const minutes = value.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};
