import { createServer } from 'node:http';
import app from './app';
import { prisma } from './config/db';
import { env } from './config/env';
import { initializeSocketServer } from './sockets/socketGateway';

const httpServer = createServer(app);
const io = initializeSocketServer(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`TripSync server is running on port ${env.PORT}`);
});

let shuttingDown = false;
const shutdown = (signal: NodeJS.Signals) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received. Shutting down...`);

  io.close();
  httpServer.close(async (error) => {
    await prisma.$disconnect();
    if (error) {
      console.error('Failed to close HTTP server:', error);
      process.exitCode = 1;
    }
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
