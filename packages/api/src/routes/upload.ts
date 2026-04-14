import type { FastifyInstance } from 'fastify';
import { authenticate, getUserFromRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(__dirname, '..', '..', 'uploads');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export async function uploadRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.post('/', async (request, reply) => {
    ensureUploadDir();

    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ success: false, error: 'No file provided' });
    }

    const ext = path.extname(file.filename);
    const storedName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, storedName);

    const writeStream = fs.createWriteStream(filePath);
    await file.file.pipe(writeStream);

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const stat = fs.statSync(filePath);

    const record = await prisma.uploadedFile.create({
      data: {
        originalName: file.filename,
        storedName,
        mimeType: file.mimetype,
        size: stat.size,
        userId: getUserFromRequest(request).id,
      },
    });

    return reply.status(201).send({
      success: true,
      data: {
        id: record.id,
        url: `/api/files/${storedName}`,
        originalName: record.originalName,
        mimeType: record.mimeType,
        size: record.size,
      },
    });
  });
}
