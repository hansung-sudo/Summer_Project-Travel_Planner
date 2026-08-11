import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { AuthContext, ParticipantRole } from '../types/api';
import { AppError } from './appError';

interface AccessTokenPayload extends JwtPayload {
  plannerId: string;
  role: ParticipantRole;
  type: 'access';
}

export const signAccessToken = (auth: AuthContext): string => {
  const options: SignOptions = {
    subject: auth.participantId,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };

  return jwt.sign(
    { plannerId: auth.plannerId, role: auth.role, type: 'access' },
    env.JWT_SECRET,
    options
  );
};

export const verifyAccessToken = (token: string): AuthContext => {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;

    if (
      !payload.sub ||
      typeof payload.plannerId !== 'string' ||
      (payload.role !== 'owner' && payload.role !== 'member') ||
      payload.type !== 'access'
    ) {
      throw new Error('Invalid access token payload');
    }

    return {
      participantId: payload.sub,
      plannerId: payload.plannerId,
      role: payload.role,
    };
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', '인증 토큰이 유효하지 않습니다.');
  }
};
