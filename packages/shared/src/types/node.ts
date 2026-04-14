export enum NodeType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  TABLE = 'table',
  IMAGE_EDITOR = 'image_editor',
  FRAME = 'frame',
  CHARACTER = 'character',
  STYLE = 'style',
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface BaseNodeData {
  id: string;
  type: NodeType;
  label: string;
  position: NodePosition;
  width?: number;
  height?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TextNodeData extends BaseNodeData {
  type: NodeType.TEXT;
  content: string;
}

export interface ImageNodeData extends BaseNodeData {
  type: NodeType.IMAGE;
  src: string;
  originalWidth?: number;
  originalHeight?: number;
  alt?: string;
}

export interface VideoNodeData extends BaseNodeData {
  type: NodeType.VIDEO;
  src: string;
  duration?: number;
  thumbnail?: string;
}

export interface DocumentNodeData extends BaseNodeData {
  type: NodeType.DOCUMENT;
  content: string;
  fileName?: string;
}

export interface AudioNodeData extends BaseNodeData {
  type: NodeType.AUDIO;
  src: string;
  duration?: number;
  fileName?: string;
  voiceId?: string;
}

export interface TableNodeData extends BaseNodeData {
  type: NodeType.TABLE;
  headers: string[];
  rows: string[][];
}

export interface ImageEditorNodeData extends BaseNodeData {
  type: NodeType.IMAGE_EDITOR;
  src: string;
  drawingData?: string;
}

export interface CharacterNodeData extends BaseNodeData {
  type: NodeType.CHARACTER;
  name: string;
  description: string;
  referenceImages: string[];
  aiDescription?: string;
}

export interface StyleNodeData extends BaseNodeData {
  type: NodeType.STYLE;
  name: string;
  description: string;
  referenceImages: string[];
  keywords: string[];
}

export type CanvasNodeData =
  | TextNodeData
  | ImageNodeData
  | VideoNodeData
  | AudioNodeData
  | DocumentNodeData
  | TableNodeData
  | ImageEditorNodeData
  | CharacterNodeData
  | StyleNodeData;

export interface CanvasEdgeData {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasData {
  id: string;
  projectId: string;
  viewport?: CanvasViewport;
  nodes: CanvasNodeData[];
  edges: CanvasEdgeData[];
}
