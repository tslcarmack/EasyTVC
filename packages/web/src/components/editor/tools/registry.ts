import type { ComponentType, ReactNode } from 'react';

export type ToolCategory = 'transform' | 'adjust' | 'annotate' | 'ai';

export interface AIToolContext {
  currentImageDataUrl: string;
  maskDataUrl?: string;
  params: Record<string, any>;
  canvasWidth: number;
  canvasHeight: number;
}

export interface EditorToolPlugin {
  id: string;
  name: string;
  icon: ComponentType<{ size?: number }>;
  category: ToolCategory;
  shortcut?: string;

  defaultParams: Record<string, any>;

  renderParams(
    params: Record<string, any>,
    onChange: (key: string, val: any) => void,
  ): ReactNode;

  renderOverlay?(
    canvasEl: HTMLCanvasElement,
    params: Record<string, any>,
  ): ReactNode;

  applyCanvas?(
    imageData: ImageData,
    params: Record<string, any>,
  ): ImageData | Promise<ImageData>;

  buildAIRequest?(context: AIToolContext): {
    prompt: string;
    referenceImageUrls: string[];
    maskImageUrl?: string;
    width?: number;
    height?: number;
    model?: string;
  };

  needsMask?: boolean;

  hint: string;
}

const toolRegistry = new Map<string, EditorToolPlugin>();

export function registerTool(plugin: EditorToolPlugin): void {
  toolRegistry.set(plugin.id, plugin);
}

export function getTool(id: string): EditorToolPlugin | undefined {
  return toolRegistry.get(id);
}

export function getToolsByCategory(category: ToolCategory): EditorToolPlugin[] {
  return [...toolRegistry.values()].filter((t) => t.category === category);
}

export function getAllTools(): EditorToolPlugin[] {
  return [...toolRegistry.values()];
}

export const CATEGORY_ORDER: ToolCategory[] = ['transform', 'adjust', 'annotate', 'ai'];

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  transform: '变换',
  adjust: '调色',
  annotate: '标注',
  ai: 'AI 智能',
};
