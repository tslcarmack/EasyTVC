import { memo } from 'react';
import { Type, Image, Video, AudioLines, Sparkles, User, Palette } from 'lucide-react';
import { NodeType } from '@easytvc/shared';

interface ConnectionMenuProps {
  x: number;
  y: number;
  sourceNodeType: NodeType;
  onSelect: (targetType: NodeType) => void;
  onClose: () => void;
}

interface MenuOption {
  type: NodeType;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  color: string;
}

function getMenuOptions(sourceType: NodeType): MenuOption[] {
  const options: MenuOption[] = [];

  options.push({
    type: NodeType.TEXT,
    label: '生成文本',
    sublabel: 'AI Text',
    icon: <Type size={16} />,
    color: '#6366f1',
  });

  options.push({
    type: NodeType.IMAGE,
    label: '生成图片',
    sublabel: 'AI Image',
    icon: <Image size={16} />,
    color: '#22c55e',
  });

  options.push({
    type: NodeType.VIDEO,
    label: '生成视频',
    sublabel: 'AI Video',
    icon: <Video size={16} />,
    color: '#f59e0b',
  });

  if (sourceType === NodeType.TEXT) {
    options.push({
      type: NodeType.AUDIO,
      label: '生成音频',
      sublabel: 'AI Audio',
      icon: <AudioLines size={16} />,
      color: '#ec4899',
    });
  }

  options.push({
    type: NodeType.CHARACTER,
    label: '角色设定',
    sublabel: 'Character',
    icon: <User size={16} />,
    color: '#ec4899',
  });

  options.push({
    type: NodeType.STYLE,
    label: '风格设定',
    sublabel: 'Style',
    icon: <Palette size={16} />,
    color: '#8b5cf6',
  });

  return options;
}

export const ConnectionMenu = memo(function ConnectionMenu({
  x,
  y,
  sourceNodeType,
  onSelect,
  onClose,
}: ConnectionMenuProps) {
  const options = getMenuOptions(sourceNodeType);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50" onClick={onClose} />

      {/* Menu */}
      <div
        className="fixed z-50 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
      >
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
          <Sparkles size={14} className="text-[var(--color-primary)]" />
          <span className="text-xs font-medium text-white">AI 生成</span>
        </div>

        <div className="py-1">
          {options.map((opt) => (
            <button
              key={opt.type}
              onClick={() => onSelect(opt.type)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[var(--color-surface-hover)]"
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: opt.color + '20', color: opt.color }}
              >
                {opt.icon}
              </div>
              <div>
                <div className="text-sm font-medium text-white">{opt.label}</div>
                <div className="text-[10px] text-[var(--color-text-secondary)]">{opt.sublabel}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
});
