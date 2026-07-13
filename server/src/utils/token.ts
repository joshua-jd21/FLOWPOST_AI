import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User } from '../models/User.js';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export function generateAccessToken(user: TokenPayload): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(
    { userId: user.userId, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn } as any
  );
}

export function generateRefreshToken(user: TokenPayload): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(
    { userId: user.userId, email: user.email, role: user.role },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn } as any
  );
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
}

export async function storeRefreshToken(
  userId: string,
  refreshToken: string
): Promise<void> {
  await User.findByIdAndUpdate(userId, { refreshToken });
}

export async function clearRefreshToken(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, { $unset: { refreshToken: '' } });
}
