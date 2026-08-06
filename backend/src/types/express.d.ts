import type { AuthContext, ParticipantDto } from './api';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      participant?: ParticipantDto;
    }
  }
}

export {};
