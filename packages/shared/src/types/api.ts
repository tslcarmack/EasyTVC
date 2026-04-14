export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  createdAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
}

export interface UpdateProjectRequest {
  name?: string;
}

export interface CreateNodeRequest {
  type: string;
  positionX: number;
  positionY: number;
  width?: number;
  height?: number;
  data: Record<string, unknown>;
}

export interface UpdateNodeRequest {
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  data?: Record<string, unknown>;
}

export interface CreateEdgeRequest {
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface SaveCanvasRequest {
  viewport?: { x: number; y: number; zoom: number };
  nodes: Array<{
    id?: string;
    type: string;
    positionX: number;
    positionY: number;
    width?: number;
    height?: number;
    data: Record<string, unknown>;
  }>;
  edges: Array<{
    id?: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourceHandle?: string;
    targetHandle?: string;
  }>;
}
