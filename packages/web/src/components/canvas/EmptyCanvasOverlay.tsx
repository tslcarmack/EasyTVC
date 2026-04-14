import { NodeType } from '@easytvc/shared';
import { useCanvasStore } from '../../stores/canvasStore';
import { Type, Image, Film, AudioLines, Palette, FileText, Table, User, Sparkles } from 'lucide-react';

const quickActions = [
  { type: NodeType.TEXT, icon: Type, label: 'Text' },
  { type: NodeType.IMAGE, icon: Image, label: 'Image' },
  { type: NodeType.VIDEO, icon: Film, label: 'Video' },
  { type: NodeType.AUDIO, icon: AudioLines, label: 'Audio' },
  { type: NodeType.CHARACTER, icon: User, label: '角色' },
  { type: NodeType.STYLE, icon: Sparkles, label: '风格' },
  { type: NodeType.IMAGE_EDITOR, icon: Palette, label: 'Doodle' },
  { type: NodeType.DOCUMENT, icon: FileText, label: 'Document' },
  { type: NodeType.TABLE, icon: Table, label: 'Table' },
] as const;

export function EmptyCanvasOverlay() {
  const addNode = useCanvasStore((s) => s.addNode);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="pointer-events-auto rounded-2xl bg-[var(--color-surface)] p-8 shadow-2xl">
        <h2 className="mb-2 text-center text-lg font-semibold text-white">
          Start Creating
        </h2>
        <p className="mb-6 text-center text-sm text-[var(--color-text-secondary)]">
          Add your first node or double-click anywhere on the canvas
        </p>
        <div className="flex gap-3">
          {quickActions.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => addNode(type, { x: 0, y: 0 })}
              className="flex flex-col items-center gap-2 rounded-xl px-5 py-4 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)] hover:text-white"
            >
              <Icon size={24} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
