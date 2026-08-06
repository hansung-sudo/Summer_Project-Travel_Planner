import 'express-async-errors';
import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';
import authRouter from './routes/auth';
import plannerRouter from './routes/planner';
import scheduleRouter from './routes/schedule';

const app = express();

app.use(cors({ origin: env.clientOrigins, credentials: true }));
app.use(express.json({ limit: '100kb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok' } });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/planners', plannerRouter);
app.use('/api/v1/planners', scheduleRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
