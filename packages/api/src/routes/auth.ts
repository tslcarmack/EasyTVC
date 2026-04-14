import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { authenticate, getUserFromRequest } from '../middleware/auth.js';
import crypto from 'node:crypto';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds
const ACCESS_TOKEN_EXPIRY = '15m';

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues[0].message });
    }

    const { email, password, name } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ success: false, error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name },
    });

    const accessToken = app.jwt.sign(
      { id: user.id, email: user.email },
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );
    const refreshToken = crypto.randomUUID();

    await redis.set(`refresh:${refreshToken}`, user.id, 'EX', REFRESH_TOKEN_EXPIRY);

    return reply.status(201).send({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          createdAt: user.createdAt.toISOString(),
        },
      },
    });
  });

  app.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues[0].message });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(401).send({ success: false, error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return reply.status(401).send({ success: false, error: 'Invalid credentials' });
    }

    const accessToken = app.jwt.sign(
      { id: user.id, email: user.email },
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );
    const refreshToken = crypto.randomUUID();

    await redis.set(`refresh:${refreshToken}`, user.id, 'EX', REFRESH_TOKEN_EXPIRY);

    return reply.send({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          createdAt: user.createdAt.toISOString(),
        },
      },
    });
  });

  app.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken?: string };
    if (!refreshToken) {
      return reply.status(400).send({ success: false, error: 'Refresh token required' });
    }

    const userId = await redis.get(`refresh:${refreshToken}`);
    if (!userId) {
      return reply.status(401).send({ success: false, error: 'Invalid or expired refresh token' });
    }

    await redis.del(`refresh:${refreshToken}`);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return reply.status(401).send({ success: false, error: 'User not found' });
    }

    const accessToken = app.jwt.sign(
      { id: user.id, email: user.email },
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );
    const newRefreshToken = crypto.randomUUID();

    await redis.set(`refresh:${newRefreshToken}`, user.id, 'EX', REFRESH_TOKEN_EXPIRY);

    return reply.send({
      success: true,
      data: { accessToken, refreshToken: newRefreshToken },
    });
  });

  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const authUser = getUserFromRequest(request);
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, email: true, name: true, avatar: true, createdAt: true },
    });

    if (!user) {
      return reply.status(404).send({ success: false, error: 'User not found' });
    }

    return reply.send({
      success: true,
      data: { ...user, createdAt: user.createdAt.toISOString() },
    });
  });
}
