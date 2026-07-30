import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import { errorHandler } from './middlewares/errorHandler';
import plannerRouter from './routes/planner';
import scheduleRouter from './routes/schedule';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'TripSync Backend Boilerplate is running' });
});

app.use('/planners', plannerRouter);
app.use('/schedules', scheduleRouter);

app.use(errorHandler);

export default app;
