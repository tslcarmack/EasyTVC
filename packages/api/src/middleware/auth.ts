import type { FastifyRequest, FastifyReply } from 'fastify';

export interface AuthUser {
  id: string;
  email: string;
}

export function getUserFromRequest(request: FastifyRequest): AuthUser {
  return (request as any).authUser;
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const decoded = await request.jwtVerify<AuthUser>();
    (request as any).authUser = decoded;
  } catch {
    reply.status(401).send({ success: false, error: 'Unauthorized' });
  }
}
