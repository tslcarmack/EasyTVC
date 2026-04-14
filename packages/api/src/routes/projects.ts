import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, getUserFromRequest } from '../middleware/auth.js';

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export async function projectRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request) => {
    const projects = await prisma.project.findMany({
      where: { userId: getUserFromRequest(request).id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });

    return {
      success: true,
      data: projects.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  });

  app.post('/', async (request, reply) => {
    const parsed = createProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues[0].message });
    }

    const project = await prisma.project.create({
      data: {
        name: parsed.data.name,
        userId: getUserFromRequest(request).id,
        canvas: { create: {} },
      },
      include: { canvas: true },
    });

    return reply.status(201).send({
      success: true,
      data: {
        id: project.id,
        name: project.name,
        canvasId: project.canvas!.id,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
    });
  });

  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const project = await prisma.project.findFirst({
      where: { id: request.params.id, userId: getUserFromRequest(request).id },
      include: { canvas: true },
    });

    if (!project) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    return {
      success: true,
      data: {
        id: project.id,
        name: project.name,
        canvasId: project.canvas?.id,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
    };
  });

  app.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const parsed = updateProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues[0].message });
    }

    const existing = await prisma.project.findFirst({
      where: { id: request.params.id, userId: getUserFromRequest(request).id },
    });
    if (!existing) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const project = await prisma.project.update({
      where: { id: request.params.id },
      data: parsed.data,
    });

    return {
      success: true,
      data: {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
    };
  });

  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const existing = await prisma.project.findFirst({
      where: { id: request.params.id, userId: getUserFromRequest(request).id },
    });
    if (!existing) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    await prisma.project.delete({ where: { id: request.params.id } });

    return { success: true };
  });
}
