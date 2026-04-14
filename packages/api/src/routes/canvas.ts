import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, getUserFromRequest } from '../middleware/auth.js';

const createNodeSchema = z.object({
  type: z.string(),
  positionX: z.number(),
  positionY: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  data: z.record(z.unknown()).default({}),
});

const updateNodeSchema = z.object({
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  data: z.record(z.unknown()).optional(),
});

const createEdgeSchema = z.object({
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

const saveCanvasSchema = z.object({
  viewport: z
    .object({
      x: z.number(),
      y: z.number(),
      zoom: z.number(),
    })
    .optional(),
  nodes: z.array(
    z.object({
      id: z.string().optional(),
      type: z.string(),
      positionX: z.number(),
      positionY: z.number(),
      width: z.number().optional(),
      height: z.number().optional(),
      data: z.record(z.unknown()).default({}),
    }),
  ),
  edges: z.array(
    z.object({
      id: z.string().optional(),
      sourceNodeId: z.string(),
      targetNodeId: z.string(),
      sourceHandle: z.string().optional(),
      targetHandle: z.string().optional(),
    }),
  ),
});

async function getCanvasForUser(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: { canvas: true },
  });
  return project?.canvas ?? null;
}

export async function canvasRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get<{ Params: { projectId: string } }>('/:projectId', async (request, reply) => {
    const canvas = await getCanvasForUser(request.params.projectId, getUserFromRequest(request).id);
    if (!canvas) {
      return reply.status(404).send({ success: false, error: 'Canvas not found' });
    }

    const [nodes, edges] = await Promise.all([
      prisma.canvasNode.findMany({
        where: { canvasId: canvas.id },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.canvasEdge.findMany({
        where: { canvasId: canvas.id },
      }),
    ]);

    return {
      success: true,
      data: {
        id: canvas.id,
        projectId: canvas.projectId,
        viewport: canvas.viewport,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          positionX: n.positionX,
          positionY: n.positionY,
          width: n.width,
          height: n.height,
          data: n.data,
          createdAt: n.createdAt.toISOString(),
          updatedAt: n.updatedAt.toISOString(),
        })),
        edges: edges.map((e) => ({
          id: e.id,
          sourceNodeId: e.sourceNodeId,
          targetNodeId: e.targetNodeId,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
        })),
      },
    };
  });

  app.put<{ Params: { projectId: string } }>('/:projectId', async (request, reply) => {
    const canvas = await getCanvasForUser(request.params.projectId, getUserFromRequest(request).id);
    if (!canvas) {
      return reply.status(404).send({ success: false, error: 'Canvas not found' });
    }

    const parsed = saveCanvasSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues[0].message });
    }

    const { viewport, nodes, edges } = parsed.data;

    await prisma.$transaction(async (tx) => {
      if (viewport) {
        await tx.canvas.update({
          where: { id: canvas.id },
          data: { viewport },
        });
      }

      await tx.canvasNode.deleteMany({ where: { canvasId: canvas.id } });
      await tx.canvasEdge.deleteMany({ where: { canvasId: canvas.id } });

      if (nodes.length > 0) {
        await tx.canvasNode.createMany({
          data: nodes.map((n) => ({
            id: n.id,
            canvasId: canvas.id,
            type: n.type,
            positionX: n.positionX,
            positionY: n.positionY,
            width: n.width,
            height: n.height,
            data: n.data as Prisma.InputJsonValue,
          })),
        });
      }

      if (edges.length > 0) {
        await tx.canvasEdge.createMany({
          data: edges.map((e) => ({
            id: e.id,
            canvasId: canvas.id,
            sourceNodeId: e.sourceNodeId,
            targetNodeId: e.targetNodeId,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })),
        });
      }
    });

    return { success: true };
  });

  app.patch<{ Params: { projectId: string } }>(
    '/:projectId/viewport',
    async (request, reply) => {
      const canvas = await getCanvasForUser(request.params.projectId, getUserFromRequest(request).id);
      if (!canvas) {
        return reply.status(404).send({ success: false, error: 'Canvas not found' });
      }

      const viewportSchema = z.object({
        x: z.number(),
        y: z.number(),
        zoom: z.number(),
      });

      const parsed = viewportSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: parsed.error.issues[0].message });
      }

      await prisma.canvas.update({
        where: { id: canvas.id },
        data: { viewport: parsed.data },
      });

      return { success: true };
    },
  );

  // Node CRUD
  app.post<{ Params: { projectId: string } }>(
    '/:projectId/nodes',
    async (request, reply) => {
      const canvas = await getCanvasForUser(request.params.projectId, getUserFromRequest(request).id);
      if (!canvas) {
        return reply.status(404).send({ success: false, error: 'Canvas not found' });
      }

      const parsed = createNodeSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: parsed.error.issues[0].message });
      }

      const { data: nodeData, ...rest } = parsed.data;
      const node = await prisma.canvasNode.create({
        data: {
          canvasId: canvas.id,
          ...rest,
          data: nodeData as Prisma.InputJsonValue,
        },
      });

      return reply.status(201).send({
        success: true,
        data: {
          id: node.id,
          type: node.type,
          positionX: node.positionX,
          positionY: node.positionY,
          width: node.width,
          height: node.height,
          data: node.data,
          createdAt: node.createdAt.toISOString(),
          updatedAt: node.updatedAt.toISOString(),
        },
      });
    },
  );

  app.put<{ Params: { projectId: string; nodeId: string } }>(
    '/:projectId/nodes/:nodeId',
    async (request, reply) => {
      const canvas = await getCanvasForUser(request.params.projectId, getUserFromRequest(request).id);
      if (!canvas) {
        return reply.status(404).send({ success: false, error: 'Canvas not found' });
      }

      const parsed = updateNodeSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: parsed.error.issues[0].message });
      }

      const existing = await prisma.canvasNode.findFirst({
        where: { id: request.params.nodeId, canvasId: canvas.id },
      });
      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Node not found' });
      }

      const { data: updateData, ...updateRest } = parsed.data;
      const node = await prisma.canvasNode.update({
        where: { id: request.params.nodeId },
        data: {
          ...updateRest,
          ...(updateData !== undefined ? { data: updateData as Prisma.InputJsonValue } : {}),
        },
      });

      return {
        success: true,
        data: {
          id: node.id,
          type: node.type,
          positionX: node.positionX,
          positionY: node.positionY,
          width: node.width,
          height: node.height,
          data: node.data,
          createdAt: node.createdAt.toISOString(),
          updatedAt: node.updatedAt.toISOString(),
        },
      };
    },
  );

  app.delete<{ Params: { projectId: string; nodeId: string } }>(
    '/:projectId/nodes/:nodeId',
    async (request, reply) => {
      const canvas = await getCanvasForUser(request.params.projectId, getUserFromRequest(request).id);
      if (!canvas) {
        return reply.status(404).send({ success: false, error: 'Canvas not found' });
      }

      const existing = await prisma.canvasNode.findFirst({
        where: { id: request.params.nodeId, canvasId: canvas.id },
      });
      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Node not found' });
      }

      await prisma.canvasNode.delete({ where: { id: request.params.nodeId } });

      return { success: true };
    },
  );

  // Edge CRUD
  app.post<{ Params: { projectId: string } }>(
    '/:projectId/edges',
    async (request, reply) => {
      const canvas = await getCanvasForUser(request.params.projectId, getUserFromRequest(request).id);
      if (!canvas) {
        return reply.status(404).send({ success: false, error: 'Canvas not found' });
      }

      const parsed = createEdgeSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: parsed.error.issues[0].message });
      }

      const edge = await prisma.canvasEdge.create({
        data: {
          canvasId: canvas.id,
          ...parsed.data,
        },
      });

      return reply.status(201).send({
        success: true,
        data: {
          id: edge.id,
          sourceNodeId: edge.sourceNodeId,
          targetNodeId: edge.targetNodeId,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        },
      });
    },
  );

  app.delete<{ Params: { projectId: string; edgeId: string } }>(
    '/:projectId/edges/:edgeId',
    async (request, reply) => {
      const canvas = await getCanvasForUser(request.params.projectId, getUserFromRequest(request).id);
      if (!canvas) {
        return reply.status(404).send({ success: false, error: 'Canvas not found' });
      }

      const existing = await prisma.canvasEdge.findFirst({
        where: { id: request.params.edgeId, canvasId: canvas.id },
      });
      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Edge not found' });
      }

      await prisma.canvasEdge.delete({ where: { id: request.params.edgeId } });

      return { success: true };
    },
  );
}
