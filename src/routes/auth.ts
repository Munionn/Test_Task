import { Router, Request, Response } from 'express';
import { db } from '../db/connection';
import { users, refresh_tokens } from '../db/schemas';
import { eq, and } from 'drizzle-orm';
import {
  hashPassword,
  generateTokenPair,
  getRefreshTokenExpiry,
  generateDeviceId,
  comparePassword,
} from '../utils/auth';
import { isValidIdentifier, isValidPassword } from '../utils/validation';
import { authenticateToken } from '../middleware/auth';

const router: Router = Router();

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { id, password } = req.body;

    if (!id || !password) {
      return res.status(400).json({ error: 'id and password are required' });
    }

    if (!isValidIdentifier(id)) {
      return res.status(400).json({ error: 'id must be a valid email or phone number' });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'password must be at least 6 characters long' });
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.identifier, id))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'User with this id already exists' });
    }

    const hashedPassword = await hashPassword(password);

    const insertResult = await db.insert(users).values({
      identifier: id,
      hashPassword: hashedPassword,
    });

    const userId = Number(insertResult[0].insertId);
    const { accessToken, refreshToken } = generateTokenPair(userId, id);

    
    const deviceId = generateDeviceId(req);

    
    await db.insert(refresh_tokens).values({
      token: refreshToken,
      userId: userId,
      deviceId: deviceId,
      expiresAt: getRefreshTokenExpiry(),
    });

    res.status(201).json({
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/signin', async (req: Request, res: Response) => {
  try {
    const { id, password } = req.body;

    if (!id || !password) {
      return res.status(400).json({ error: 'id and password are required' });
    }

    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.identifier, id))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const isPasswordValid = await comparePassword(password, user.hashPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokenPair(user.id, user.identifier);

    const deviceId = generateDeviceId(req);
    
    const [existingToken] = await db
      .select()
      .from(refresh_tokens)
      .where(
        and(
          eq(refresh_tokens.userId, user.id),
          eq(refresh_tokens.deviceId, deviceId)
        )
      )
      .limit(1);

    if (existingToken) {
      await db
        .update(refresh_tokens)
        .set({
          token: refreshToken,
          expiresAt: getRefreshTokenExpiry(),
        })
        .where(eq(refresh_tokens.id, existingToken.id));
    } else {
      const activeDevices = await db
        .select()
        .from(refresh_tokens)
        .where(eq(refresh_tokens.userId, user.id));

      if (activeDevices.length >= 5) {
        const sortedDevices = [...activeDevices].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA - dateB;
        });
        await db.delete(refresh_tokens).where(eq(refresh_tokens.id, sortedDevices[0].id));
      }

      await db.insert(refresh_tokens).values({
        token: refreshToken,
        userId: user.id,
        deviceId: deviceId,
        expiresAt: getRefreshTokenExpiry(),
      });
    }

    res.status(200).json({
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/signin/new_token', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' });
    }

    const [tokenRecord] = await db
      .select()
      .from(refresh_tokens)
      .where(eq(refresh_tokens.token, refreshToken))
      .limit(1);

    if (!tokenRecord) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    const now = new Date();
    const expiresAt = new Date(tokenRecord.expiresAt);
    if (expiresAt <= now) {

      await db.delete(refresh_tokens).where(eq(refresh_tokens.id, tokenRecord.id));
      return res.status(401).json({ error: 'Refresh token has expired' });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, tokenRecord.userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokenPair(
      user.id,
      user.identifier
    );
    await db.delete(refresh_tokens).where(eq(refresh_tokens.id, tokenRecord.id));

    await db.insert(refresh_tokens).values({
      token: newRefreshToken,
      userId: user.id,
      deviceId: tokenRecord.deviceId,
      expiresAt: getRefreshTokenExpiry(),
    });

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error: any) {
    console.error('New token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/info', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.status(200).json({ identifier: user.identifier });
  } catch (error: any) {
    console.error('Info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const deviceId = generateDeviceId(req);

    await db
      .delete(refresh_tokens)
      .where(
        and(
          eq(refresh_tokens.userId, user.userId),
          eq(refresh_tokens.deviceId, deviceId)
        )
      );

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

