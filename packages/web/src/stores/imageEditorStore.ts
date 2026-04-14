import { create } from 'zustand';
import { getTool } from '../components/editor/tools/registry';
import { useCanvasStore } from './canvasStore';
import { NodeType } from '@easytvc/shared';

export interface HistoryEntry {
  id: string;
  action: string;
  imageDataUrl: string;
  thumbnail: string;
  timestamp: number;
  toolId: string;
}

export interface LightSource {
  id: string;
  x: number;
  y: number;
  intensity: number;
  colorTemp: number;
  radius: number;
}

export interface AnnotationItem {
  id: string;
  type: 'brush' | 'rect' | 'ellipse' | 'arrow' | 'text' | 'mosaic';
  data: Record<string, any>;
}

interface ImageEditorState {
  isOpen: boolean;
  sourceNodeId: string | null;
  sourceImageUrl: string | null;

  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  panOffset: { x: number; y: number };

  activeTool: string | null;
  toolParams: Record<string, any>;

  maskData: string | null;
  annotations: AnnotationItem[];
  lightSources: LightSource[];

  history: HistoryEntry[];
  historyIndex: number;

  isGenerating: boolean;
  generationError: string | null;

  open: (nodeId: string, imageUrl: string) => void;
  close: () => void;
  setTool: (toolId: string | null) => void;
  setToolParam: (key: string, value: any) => void;
  setToolParams: (params: Record<string, any>) => void;
  setZoom: (zoom: number) => void;
  setPan: (offset: { x: number; y: number }) => void;
  setCanvasSize: (w: number, h: number) => void;
  setMaskData: (data: string | null) => void;

  pushHistory: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  undo: () => void;
  redo: () => void;
  jumpToHistory: (index: number) => void;
  getCurrentImageDataUrl: () => string | null;

  setGenerating: (v: boolean) => void;
  setGenerationError: (err: string | null) => void;

  saveOverwrite: (dataUrl: string) => void;
  saveAsNewNode: (dataUrl: string) => void;
}

const MAX_HISTORY = 50;

let idCounter = 0;
function nextId() {
  return `he-${++idCounter}-${Date.now()}`;
}

export const useImageEditorStore = create<ImageEditorState>((set, get) => ({
  isOpen: false,
  sourceNodeId: null,
  sourceImageUrl: null,

  canvasWidth: 0,
  canvasHeight: 0,
  zoom: 1,
  panOffset: { x: 0, y: 0 },

  activeTool: null,
  toolParams: {},

  maskData: null,
  annotations: [],
  lightSources: [],

  history: [],
  historyIndex: -1,

  isGenerating: false,
  generationError: null,

  open: (nodeId, imageUrl) => {
    set({
      isOpen: true,
      sourceNodeId: nodeId,
      sourceImageUrl: imageUrl,
      activeTool: null,
      toolParams: {},
      maskData: null,
      annotations: [],
      lightSources: [],
      history: [],
      historyIndex: -1,
      zoom: 1,
      panOffset: { x: 0, y: 0 },
      isGenerating: false,
      generationError: null,
    });
  },

  close: () => {
    set({
      isOpen: false,
      sourceNodeId: null,
      sourceImageUrl: null,
      history: [],
      historyIndex: -1,
    });
  },

  setTool: (toolId) => {
    if (!toolId) {
      set({ activeTool: null, toolParams: {} });
      return;
    }
    const tool = getTool(toolId);
    const params = tool ? { ...tool.defaultParams } : {};

    const { canvasWidth, canvasHeight } = get();
    if (toolId === 'crop' && canvasWidth > 0) {
      params.x = 0;
      params.y = 0;
      params.w = canvasWidth;
      params.h = canvasHeight;
    }
    if (toolId === 'resize' && canvasWidth > 0) {
      params.width = canvasWidth;
      params.height = canvasHeight;
      params._origW = canvasWidth;
      params._origH = canvasHeight;
    }

    set({
      activeTool: toolId,
      toolParams: params,
      maskData: null,
    });
  },

  setToolParam: (key, value) => {
    set((s) => ({ toolParams: { ...s.toolParams, [key]: value } }));
  },

  setToolParams: (params) => {
    set({ toolParams: params });
  },

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
  setPan: (offset) => set({ panOffset: offset }),
  setCanvasSize: (w, h) => set({ canvasWidth: w, canvasHeight: h }),
  setMaskData: (data) => set({ maskData: data }),

  pushHistory: (entry) => {
    const { history, historyIndex } = get();
    const truncated = history.slice(0, historyIndex + 1);
    const newEntry: HistoryEntry = {
      ...entry,
      id: nextId(),
      timestamp: Date.now(),
    };
    const next = [...truncated, newEntry];
    if (next.length > MAX_HISTORY) next.shift();
    set({ history: next, historyIndex: next.length - 1 });
  },

  undo: () => {
    const { historyIndex } = get();
    if (historyIndex > 0) {
      set({ historyIndex: historyIndex - 1 });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({ historyIndex: historyIndex + 1 });
    }
  },

  jumpToHistory: (index) => {
    const { history } = get();
    if (index >= 0 && index < history.length) {
      set({ historyIndex: index });
    }
  },

  getCurrentImageDataUrl: () => {
    const { history, historyIndex, sourceImageUrl } = get();
    if (historyIndex >= 0 && history[historyIndex]) {
      return history[historyIndex].imageDataUrl;
    }
    return sourceImageUrl;
  },

  setGenerating: (v) => set({ isGenerating: v }),
  setGenerationError: (err) => set({ generationError: err }),

  saveOverwrite: (dataUrl) => {
    const { sourceNodeId } = get();
    if (!sourceNodeId) return;
    useCanvasStore.getState().updateNodeData(sourceNodeId, { src: dataUrl });
    get().close();
  },

  saveAsNewNode: (dataUrl) => {
    const { sourceNodeId } = get();
    if (!sourceNodeId) return;
    const canvasStore = useCanvasStore.getState();
    const sourceNode = canvasStore.nodes.find((n) => n.id === sourceNodeId);
    const position = {
      x: (sourceNode?.position.x ?? 0) + 450,
      y: sourceNode?.position.y ?? 0,
    };
    const newId = canvasStore.addNodeWithEdge(NodeType.IMAGE, position, sourceNodeId);
    canvasStore.updateNodeData(newId, { src: dataUrl, label: 'Edited' });
    get().close();
  },
}));
