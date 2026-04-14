import { NodeType } from '@easytvc/shared';
import { ArrowLeft, Type, Image, Film, AudioLines, FileText, Table, Palette, Frame, User, Sparkles, Undo2, Redo2 } from 'lucide-react';
import { useCanvasStore } from '../../stores/canvasStore';

interface ToolbarProps {
  projectName: string;
  onBack: () => void;
}

const nodeTools = [
  { type: NodeType.TEXT, icon: Type, label: 'Text' },
  { type: NodeType.IMAGE, icon: Image, label: 'Image' },
  { type: NodeType.VIDEO, icon: Film, label: 'Video' },
  { type: NodeType.AUDIO, icon: AudioLines, label: 'Audio' },
  { type: NodeType.CHARACTER, icon: User, label: '角色' },
  { type: NodeType.STYLE, icon: Sparkles, label: '风格' },
  { type: NodeType.IMAGE_EDITOR, icon: Palette, label: 'Doodle' },
  { type: NodeType.FRAME, icon: Frame, label: 'Scene' },
  { type: NodeType.DOCUMENT, icon: FileText, label: 'Document' },
  { type: NodeType.TABLE, icon: Table, label: 'Table' },
] as const;

export function CanvasToolbar({ projectName, onBack }: ToolbarProps) {
  const { addNode, undo, redo, historyIndex, history } = useCanvasStore();

  function handleDragStart(event: React.DragEvent, type: NodeType) {
    event.dataTransfer.setData('application/easytvc-node-type', type);
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div className="flex w-14 flex-col items-center border-r border-[var(--color-border)] bg-[var(--color-surface)] py-3">
      <button
        onClick={onBack}
        className="mb-1 rounded-lg p-2 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)] hover:text-white"
        title="Back to projects"
      >
        <ArrowLeft size={20} />
      </button>

      <div className="mb-3 w-8 truncate text-center text-[9px] text-[var(--color-text-secondary)]">
        {projectName}
      </div>

      <div className="mb-3 h-px w-8 bg-[var(--color-border)]" />

      <div className="flex flex-col gap-1">
        {nodeTools.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            draggable
            onDragStart={(e) => handleDragStart(e, type)}
            onClick={() => {
              addNode(type, { x: Math.random() * 400, y: Math.random() * 400 });
            }}
            className="group relative rounded-lg p-2 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)] hover:text-white"
            title={label}
          >
            <Icon size={20} />
            <span className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-md bg-[var(--color-bg)] px-2 py-1 text-xs text-white shadow-lg group-hover:block">
              {label}
            </span>
          </button>
        ))}
      </div>

      <div className="my-3 h-px w-8 bg-[var(--color-border)]" />

      <div className="flex flex-col gap-1">
        <button
          onClick={undo}
          disabled={historyIndex <= 0}
          className="rounded-lg p-2 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)] hover:text-white disabled:opacity-30"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className="rounded-lg p-2 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)] hover:text-white disabled:opacity-30"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={18} />
        </button>
      </div>
    </div>
  );
}
