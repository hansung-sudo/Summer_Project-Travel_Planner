import 'dotenv/config';
import { z } from 'zod';

const EXAMPLE_JWT_SECRET = 'replace-this-with-a-random-secret-at-least-32-characters-long';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters')
    .refine((value) => value !== EXAMPLE_JWT_SECRET, 'JWT_SECRET must not use the example value'),
  JWT_EXPIRES_IN: z.string().min(1).default('7d'),
  CLIENT_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const message = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join(', ');
  throw new Error(`Invalid environment variables: ${message}`);
}

export const env = {
  ...parsed.data,
  clientOrigins: parsed.data.CLIENT_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
