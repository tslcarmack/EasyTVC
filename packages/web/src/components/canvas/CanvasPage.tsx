import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  type NodeTypes,
  BackgroundVariant,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { NodeType } from '@easytvc/shared';
import { Save, Check, Loader2 } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { useCanvasStore, type EasyTVCNodeData } from '../../stores/canvasStore';
import { CanvasToolbar } from '../toolbar/CanvasToolbar';
import { ConnectionMenu } from './ConnectionMenu';
import { TextNodeComponent } from '../nodes/TextNode';
import { ImageNodeComponent } from '../nodes/ImageNode';
import { VideoNodeComponent } from '../nodes/VideoNode';
import { AudioNodeComponent } from '../nodes/AudioNode';
import { DocumentNodeComponent } from '../nodes/DocumentNode';
import { TableNodeComponent } from '../nodes/TableNode';
import { ImageEditorNodeComponent } from '../nodes/ImageEditorNode';
import { FrameNodeComponent } from '../nodes/FrameNode';
import { CharacterNodeComponent } from '../nodes/CharacterNode';
import { StyleNodeComponent } from '../nodes/StyleNode';
import { TimelinePanel } from '../timeline/TimelinePanel';
import { PipelinePanel } from '../pipeline/PipelinePanel';
import { ImageEditorPanel } from '../editor/ImageEditorPanel';
import { EmptyCanvasOverlay } from './EmptyCanvasOverlay';
import type { Node } from '@xyflow/react';

const nodeTypes: NodeTypes = {
  [NodeType.TEXT]: TextNodeComponent,
  [NodeType.IMAGE]: ImageNodeComponent,
  [NodeType.VIDEO]: VideoNodeComponent,
  [NodeType.AUDIO]: AudioNodeComponent,
  [NodeType.DOCUMENT]: DocumentNodeComponent,
  [NodeType.TABLE]: TableNodeComponent,
  [NodeType.IMAGE_EDITOR]: ImageEditorNodeComponent,
  [NodeType.FRAME]: FrameNodeComponent,
  [NodeType.CHARACTER]: CharacterNodeComponent,
  [NodeType.STYLE]: StyleNodeComponent,
};

interface ConnMenuState {
  x: number;
  y: number;
  sourceNodeId: string;
  sourceNodeType: NodeType;
}

function CanvasInner() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const reactFlowInstance = useReactFlow();
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const connectingNodeRef = useRef<string | null>(null);
  const [connMenu, setConnMenu] = useState<ConnMenuState | null>(null);

  const {
    nodes,
    edges,
    isDirty,
    editingNodeId,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    addNodeWithEdge,
    setProjectId,
    setEditingNode,
    setPipelineNode,
    pipelineNodeId,
    loadCanvas,
    pushHistory,
    markClean,
  } = useCanvasStore();

  useEffect(() => {
    if (!projectId) return;
    setProjectId(projectId);

    async function load() {
      setLoading(true);

      const [projectRes, canvasRes] = await Promise.all([
        apiFetch<{ id: string; name: string }>(`/projects/${projectId}`),
        apiFetch<{
          nodes: Array<{
            id: string;
            type: string;
            positionX: number;
            positionY: number;
            width: number | null;
            height: number | null;
            data: Record<string, unknown>;
          }>;
          edges: Array<{
            id: string;
            sourceNodeId: string;
            targetNodeId: string;
            sourceHandle?: string;
            targetHandle?: string;
          }>;
          viewport: { x: number; y: number; zoom: number } | null;
        }>(`/canvas/${projectId}`),
      ]);

      if (projectRes.success && projectRes.data) {
        setProjectName(projectRes.data.name);
      }

      if (canvasRes.success && canvasRes.data) {
        const flowNodes: Node<EasyTVCNodeData>[] = canvasRes.data.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: { x: n.positionX, y: n.positionY },
          data: {
            label: (n.data as Record<string, unknown>).label as string || n.type,
            nodeType: n.type as NodeType,
            ...(n.data as Record<string, unknown>),
          },
          style: n.width && n.height ? { width: n.width, height: n.height } : undefined,
        }));

        const flowEdges = canvasRes.data.edges.map((e) => ({
          id: e.id,
          source: e.sourceNodeId,
          target: e.targetNodeId,
          sourceHandle: e.sourceHandle || undefined,
          targetHandle: e.targetHandle || undefined,
        }));

        loadCanvas(flowNodes, flowEdges);

        if (canvasRes.data.viewport) {
          reactFlowInstance.setViewport(canvasRes.data.viewport);
        }
      } else {
        loadCanvas([], []);
      }

      setLoading(false);
    }

    load();
  }, [projectId, setProjectId, loadCanvas]);

  const handleSave = useCallback(async () => {
    if (!projectId || saveStatus === 'saving') return;
    setSaveStatus('saving');
    const viewport = reactFlowInstance.getViewport();
    await apiFetch(`/canvas/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify({
        viewport,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          positionX: n.position.x,
          positionY: n.position.y,
          width: n.measured?.width ?? (n.style as Record<string, number>)?.width,
          height: n.measured?.height ?? (n.style as Record<string, number>)?.height,
          data: n.data,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          sourceNodeId: e.source,
          targetNodeId: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
        })),
      }),
    });
    markClean();
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 1500);
  }, [projectId, saveStatus, nodes, edges, markClean, reactFlowInstance]);

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('.react-flow__node')) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addNode(NodeType.TEXT, position);
    },
    [addNode, reactFlowInstance],
  );

  const justEditedRef = useRef(false);

  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      justEditedRef.current = true;
      setEditingNode(node.id);
      setTimeout(() => { justEditedRef.current = false; }, 200);
    },
    [setEditingNode],
  );

  const handlePaneClick = useCallback(() => {
    if (justEditedRef.current) return;
    if (editingNodeId) {
      setEditingNode(null);
    }
  }, [editingNodeId, setEditingNode]);

  const connectionMadeRef = useRef(false);

  const handleConnectStart = useCallback(
    (_: any, params: { nodeId: string | null; handleType: string | null }) => {
      connectingNodeRef.current = params.nodeId;
      connectionMadeRef.current = false;
    },
    [],
  );

  const handleConnect = useCallback(
    (connection: Parameters<typeof onConnect>[0]) => {
      connectionMadeRef.current = true;
      onConnect(connection);
    },
    [onConnect],
  );

  const handleConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const sourceId = connectingNodeRef.current;
      connectingNodeRef.current = null;
      if (!sourceId) return;

      if (connectionMadeRef.current) return;

      const target = (event as MouseEvent).target as HTMLElement;
      if (target?.closest('.react-flow__handle')) return;
      if (target?.closest('.react-flow__node')) return;

      const sourceNode = nodes.find((n) => n.id === sourceId);
      if (!sourceNode) return;

      const clientX = 'clientX' in event ? event.clientX : (event as TouchEvent).touches[0].clientX;
      const clientY = 'clientY' in event ? event.clientY : (event as TouchEvent).touches[0].clientY;

      setConnMenu({
        x: clientX,
        y: clientY,
        sourceNodeId: sourceId,
        sourceNodeType: sourceNode.data.nodeType,
      });
    },
    [nodes],
  );

  const handleConnMenuSelect = useCallback(
    (targetType: NodeType) => {
      if (!connMenu) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: connMenu.x,
        y: connMenu.y,
      });

      const newNodeId = addNodeWithEdge(targetType, position, connMenu.sourceNodeId);

      setConnMenu(null);
      setEditingNode(newNodeId);
    },
    [connMenu, reactFlowInstance, addNodeWithEdge, setEditingNode],
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/easytvc-node-type') as NodeType;
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addNode(type, position);
    },
    [addNode, reactFlowInstance],
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          useCanvasStore.getState().redo();
        } else {
          useCanvasStore.getState().undo();
        }
      }
      if (e.key === 'Escape' && useCanvasStore.getState().editingNodeId) {
        useCanvasStore.getState().setEditingNode(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  function handleNodesChangeWithHistory(...args: Parameters<typeof onNodesChange>) {
    onNodesChange(...args);
    const hasPositionChange = args[0].some(
      (c) => c.type === 'position' && 'dragging' in c && c.dragging === false,
    );
    if (hasPositionChange) pushHistory();
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-bg)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-bg)]">
      <CanvasToolbar projectName={projectName} onBack={() => navigate('/projects')} />

      <div className="relative flex-1 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChangeWithHistory}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onConnectStart={handleConnectStart}
          onConnectEnd={handleConnectEnd}
          onDoubleClick={handleDoubleClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onPaneClick={handlePaneClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          nodeTypes={nodeTypes}
          nodesDraggable={!editingNodeId}
          fitView
          deleteKeyCode={editingNodeId ? [] : ['Backspace', 'Delete']}
          multiSelectionKeyCode="Shift"
          className="bg-[var(--color-bg)]"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2e2e35" />
          <Controls
            className="!bg-[var(--color-surface)] !border-[var(--color-border)] !rounded-lg !shadow-lg"
          />
          <MiniMap
            className="!bg-[var(--color-surface)] !border-[var(--color-border)] !rounded-lg"
            nodeColor="#6366f1"
            maskColor="rgba(0,0,0,0.6)"
          />
        </ReactFlow>

        {nodes.length === 0 && <EmptyCanvasOverlay />}

        {/* ── Top-right canvas toolbar ── */}
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          {isDirty && saveStatus === 'idle' && (
            <span className="text-xs text-yellow-400/80">未保存</span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <Check size={12} /> 已保存
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-lg transition ${
              isDirty && saveStatus !== 'saving'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/20 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/30'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
            } disabled:cursor-not-allowed disabled:opacity-50`}
            title="保存 (Ctrl+S)"
          >
            {saveStatus === 'saving' ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Save size={13} />
            )}
            {saveStatus === 'saving' ? '保存中…' : '保存'}
          </button>
        </div>

        <TimelinePanel />
      </div>

      {pipelineNodeId && (
        <PipelinePanel
          scriptNodeId={pipelineNodeId}
          onClose={() => setPipelineNode(null)}
        />
      )}

      {connMenu && (
        <ConnectionMenu
          x={connMenu.x}
          y={connMenu.y}
          sourceNodeType={connMenu.sourceNodeType}
          onSelect={handleConnMenuSelect}
          onClose={() => setConnMenu(null)}
        />
      )}

      <ImageEditorPanel />
    </div>
  );
}

export function CanvasPage() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
