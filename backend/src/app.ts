import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'TripSync Backend Boilerplate is running' });
});

app.use(errorHandler);

export default app;
