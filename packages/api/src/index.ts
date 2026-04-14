import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authRoutes } from './routes/auth.js';
import { projectRoutes } from './routes/projects.js';
import { canvasRoutes } from './routes/canvas.js';
import { uploadRoutes } from './routes/upload.js';
import { generationRoutes } from './routes/generation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'easytvc-dev-secret-change-in-production';

const app = Fastify({
  logger: true,
  bodyLimit: 50 * 1024 * 1024,
});

async function start() {
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  await app.register(jwt, { secret: JWT_SECRET });

  await app.register(multipart, {
    limits: { fileSize: 100 * 1024 * 1024 },
  });

  const uploadsDir = path.resolve(__dirname, '..', 'uploads');
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/api/files/',
    decorateReply: false,
  });

  app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(projectRoutes, { prefix: '/api/projects' });
  await app.register(canvasRoutes, { prefix: '/api/canvas' });
  await app.register(uploadRoutes, { prefix: '/api/upload' });
  await app.register(generationRoutes, { prefix: '/api/generate' });

  await app.listen({ port: PORT, host: HOST });
  console.log(`EasyTVC API running on http://${HOST}:${PORT}`);
}

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
