import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/auth';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Access token is required' });
      return;
    }

    const decoded = verifyAccessToken(token);
    
    req.user = decoded;
    
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

