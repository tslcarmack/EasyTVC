import { create } from 'zustand';
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type XYPosition,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge as rfAddEdge,
} from '@xyflow/react';
import { NodeType, DEFAULT_NODE_DIMENSIONS } from '@easytvc/shared';

export interface EasyTVCNodeData extends Record<string, unknown> {
  label: string;
  nodeType: NodeType;
  content?: string;
  src?: string;
  headers?: string[];
  rows?: string[][];
  fileName?: string;
  voiceId?: string;
  duration?: number;
  generationStatus?: 'idle' | 'generating' | 'completed' | 'failed';
  generationError?: string;
  generationTaskId?: string;
  lastPrompt?: string;
  lastModel?: string;
  // Character node fields
  characterName?: string;
  description?: string;
  referenceImages?: string[];
  aiDescription?: string;
  // Style node fields
  keywords?: string[];
}

type FlowNode = Node<EasyTVCNodeData>;
type FlowEdge = Edge;

interface HistoryEntry {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

interface CanvasState {
  projectId: string | null;
  nodes: FlowNode[];
  edges: FlowEdge[];
  history: HistoryEntry[];
  historyIndex: number;
  isDirty: boolean;
  editingNodeId: string | null;
  pipelineNodeId: string | null;

  setProjectId: (id: string) => void;
  setEditingNode: (id: string | null) => void;
  setPipelineNode: (id: string | null) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (type: NodeType, position: XYPosition) => void;
  addNodeWithEdge: (type: NodeType, position: XYPosition, sourceNodeId: string) => string;
  updateNodeData: (nodeId: string, data: Partial<EasyTVCNodeData>) => void;
  removeNodes: (ids: string[]) => void;
  removeEdges: (ids: string[]) => void;
  loadCanvas: (nodes: FlowNode[], edges: FlowEdge[]) => void;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  markClean: () => void;
}

let nodeIdCounter = 0;
function generateNodeId() {
  return `node_${Date.now()}_${++nodeIdCounter}`;
}

function generateEdgeId() {
  return `edge_${Date.now()}_${++nodeIdCounter}`;
}

function getDefaultDataForType(type: NodeType): Partial<EasyTVCNodeData> {
  switch (type) {
    case NodeType.TEXT:
      return { content: '' };
    case NodeType.IMAGE:
      return { src: '' };
    case NodeType.VIDEO:
      return { src: '' };
    case NodeType.AUDIO:
      return { src: '' };
    case NodeType.DOCUMENT:
      return { content: '', fileName: '' };
    case NodeType.TABLE:
      return { headers: ['Column 1', 'Column 2', 'Column 3'], rows: [['', '', '']] };
    case NodeType.IMAGE_EDITOR:
      return { src: '', drawingData: '' };
    case NodeType.FRAME:
      return { frameColor: '#6366f1' };
    case NodeType.CHARACTER:
      return { characterName: '', description: '', referenceImages: [], aiDescription: '' };
    case NodeType.STYLE:
      return { description: '', referenceImages: [], keywords: [] };
    default:
      return {};
  }
}

function getNodeLabel(type: NodeType): string {
  const labels: Record<string, string> = {
    [NodeType.TEXT]: 'Text',
    [NodeType.IMAGE]: 'Image',
    [NodeType.VIDEO]: 'Video',
    [NodeType.AUDIO]: 'Audio',
    [NodeType.DOCUMENT]: 'Document',
    [NodeType.TABLE]: 'Table',
    [NodeType.IMAGE_EDITOR]: 'Image Editor',
    [NodeType.FRAME]: 'Scene',
    [NodeType.CHARACTER]: 'Character',
    [NodeType.STYLE]: 'Style',
  };
  return labels[type] || 'Node';
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  projectId: null,
  nodes: [],
  edges: [],
  history: [],
  historyIndex: -1,
  isDirty: false,
  editingNodeId: null,
  pipelineNodeId: null,

  setProjectId: (id) => set({ projectId: id }),
  setEditingNode: (id) => set({ editingNodeId: id }),
  setPipelineNode: (id) => set({ pipelineNodeId: id }),

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as FlowNode[],
      isDirty: true,
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
      isDirty: true,
    }));
  },

  onConnect: (connection) => {
    set((state) => ({
      edges: rfAddEdge({ ...connection, id: generateEdgeId() }, state.edges),
      isDirty: true,
    }));
    get().pushHistory();
  },

  addNode: (type, position) => {
    const dims = DEFAULT_NODE_DIMENSIONS[type] || { width: 300, height: 200 };
    const newNode: FlowNode = {
      id: generateNodeId(),
      type,
      position,
      data: {
        label: getNodeLabel(type),
        nodeType: type,
        ...getDefaultDataForType(type),
      },
      style: { width: dims.width, height: dims.height },
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      isDirty: true,
    }));
    get().pushHistory();
  },

  addNodeWithEdge: (type, position, sourceNodeId) => {
    const dims = DEFAULT_NODE_DIMENSIONS[type] || { width: 300, height: 200 };
    const newNode: FlowNode = {
      id: generateNodeId(),
      type,
      position,
      data: {
        label: getNodeLabel(type),
        nodeType: type,
        ...getDefaultDataForType(type),
      },
      style: { width: dims.width, height: dims.height },
    };

    const newEdge: FlowEdge = {
      id: generateEdgeId(),
      source: sourceNodeId,
      target: newNode.id,
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      edges: [...state.edges, newEdge],
      isDirty: true,
    }));
    get().pushHistory();
    return newNode.id;
  },

  updateNodeData: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
      ),
      isDirty: true,
    }));
  },

  removeNodes: (ids) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => !ids.includes(n.id)),
      edges: state.edges.filter((e) => !ids.includes(e.source) && !ids.includes(e.target)),
      isDirty: true,
    }));
    get().pushHistory();
  },

  removeEdges: (ids) => {
    set((state) => ({
      edges: state.edges.filter((e) => !ids.includes(e.id)),
      isDirty: true,
    }));
    get().pushHistory();
  },

  loadCanvas: (nodes, edges) => {
    set({
      nodes,
      edges,
      history: [{ nodes, edges }],
      historyIndex: 0,
      isDirty: false,
    });
  },

  pushHistory: () => {
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({ nodes: [...state.nodes], edges: [...state.edges] });
      if (newHistory.length > 50) newHistory.shift();
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },

  undo: () => {
    set((state) => {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      const entry = state.history[newIndex];
      return {
        nodes: [...entry.nodes],
        edges: [...entry.edges],
        historyIndex: newIndex,
        isDirty: true,
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      const entry = state.history[newIndex];
      return {
        nodes: [...entry.nodes],
        edges: [...entry.edges],
        historyIndex: newIndex,
        isDirty: true,
      };
    });
  },

  markClean: () => set({ isDirty: false }),
}));
