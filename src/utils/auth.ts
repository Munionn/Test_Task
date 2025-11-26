import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { Request } from 'express';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
const JWT_EXPIRES_IN = '10m';
const REFRESH_TOKEN_EXPIRES_IN_DAYS = 7;

export interface JWTPayload {
  userId: number;
  identifier: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export function generateAccessToken(userId: number, identifier: string): string {
  const payload: JWTPayload = {
    userId,
    identifier,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

export function generateTokenPair(userId: number, identifier: string): TokenPair {
  return {
    accessToken: generateAccessToken(userId, identifier),
    refreshToken: generateRefreshToken(),
  };
}

export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export function verifyRefreshToken(token: string): string {
  if (!token || token.length < 32) {
    throw new Error('Invalid refresh token');
  }
  return token;
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function getRefreshTokenExpiry(): Date {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + REFRESH_TOKEN_EXPIRES_IN_DAYS);
  return expiryDate;
}



export function generateDeviceId(req: Request): string {
  const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
  const userAgent = req.get('user-agent') || 'unknown';
  const deviceString = `${ip}-${userAgent}`;
  return crypto.createHash('sha256').update(deviceString).digest('hex');
}

