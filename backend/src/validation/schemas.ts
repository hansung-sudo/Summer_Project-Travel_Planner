import { z } from 'zod';

const timeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, '시간 형식은 HH:mm이어야 합니다.');

const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional();

const latitudeSchema = z.number().finite().min(-90).max(90).nullable().optional();
const longitudeSchema = z.number().finite().min(-180).max(180).nullable().optional();

const validateCoordinatePair = (
  data: { placeLat?: number | null; placeLng?: number | null },
  context: z.RefinementCtx
) => {
  const latitudeProvided = data.placeLat !== undefined;
  const longitudeProvided = data.placeLng !== undefined;

  if (latitudeProvided !== longitudeProvided) {
    context.addIssue({
      code: 'custom',
      message: '위도와 경도는 함께 입력해야 합니다.',
      path: ['placeLat'],
    });
  }

  if (
    latitudeProvided &&
    longitudeProvided &&
    (data.placeLat === null) !== (data.placeLng === null)
  ) {
    context.addIssue({
      code: 'custom',
      message: '위도와 경도는 함께 비워야 합니다.',
      path: ['placeLat'],
    });
  }
};

export const createPlannerBodySchema = z
  .object({
    title: z.string().trim().min(1).max(50),
  })
  .strict();

export const authSessionBodySchema = z
  .object({
    shareCode: z.string().trim().transform((value) => value.toUpperCase()),
    name: z.string().trim().min(1).max(20),
    password: z.string().min(4).max(20),
  })
  .strict()
  .refine((data) => /^[A-Z0-9]{6}$/.test(data.shareCode), {
    message: '공유 코드는 6자리 영문 대문자와 숫자여야 합니다.',
    path: ['shareCode'],
  });

const scheduleFields = {
  startTime: timeSchema,
  endTime: timeSchema,
  placeName: optionalText(100),
  placeLat: latitudeSchema,
  placeLng: longitudeSchema,
  content: optionalText(1000),
};

export const createScheduleBodySchema = z
  .object(scheduleFields)
  .strict()
  .superRefine((data, context) => {
    if (data.startTime === data.endTime) {
      context.addIssue({
        code: 'custom',
        message: '시작 시간과 종료 시간은 달라야 합니다.',
        path: ['endTime'],
      });
    }
    validateCoordinatePair(data, context);
  });

export const updateScheduleBodySchema = z
  .object(scheduleFields)
  .partial()
  .strict()
  .superRefine((data, context) => {
    if (Object.keys(data).length === 0) {
      context.addIssue({ code: 'custom', message: '수정할 값을 입력해야 합니다.' });
    }
    if (data.startTime && data.endTime && data.startTime === data.endTime) {
      context.addIssue({
        code: 'custom',
        message: '시작 시간과 종료 시간은 달라야 합니다.',
        path: ['endTime'],
      });
    }
    validateCoordinatePair(data, context);
  });

export const messagePayloadSchema = z
  .object({
    content: z.string().trim().min(1).max(200),
  })
  .strict();

export const plannerIdParamsSchema = z.object({
  plannerId: z.string().uuid(),
});

export const scheduleParamsSchema = z.object({
  plannerId: z.string().uuid(),
  scheduleId: z.string().uuid(),
});

export const createScheduleParamsSchema = z.object({
  plannerId: z.string().uuid(),
  dayId: z.string().uuid(),
});

export const shareCodeParamsSchema = z.object({
  shareCode: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => /^[A-Z0-9]{6}$/.test(value)),
});

export type CreatePlannerInput = z.infer<typeof createPlannerBodySchema>;
export type AuthSessionInput = z.infer<typeof authSessionBodySchema>;
export type CreateScheduleInput = z.infer<typeof createScheduleBodySchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleBodySchema>;
