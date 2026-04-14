import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useImageEditorStore } from '../../stores/imageEditorStore';
import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  getToolsByCategory,
  type EditorToolPlugin,
  type ToolCategory,
} from './tools/registry';

export function EditorToolbar() {
  const { activeTool, setTool } = useImageEditorStore();
  const [expandedCat, setExpandedCat] = useState<ToolCategory | null>(() => {
    if (!activeTool) return 'transform';
    const allTools = CATEGORY_ORDER.flatMap((c) =>
      getToolsByCategory(c).map((t) => ({ ...t, cat: c })),
    );
    const found = allTools.find((t) => t.id === activeTool);
    return found?.cat ?? 'transform';
  });

  const toggleCat = (cat: ToolCategory) => {
    setExpandedCat((prev) => (prev === cat ? null : cat));
  };

  return (
    <div className="flex w-[52px] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      {CATEGORY_ORDER.map((cat) => {
        const tools = getToolsByCategory(cat);
        if (tools.length === 0) return null;
        const isExpanded = expandedCat === cat;
        const hasActiveTool = tools.some((t) => t.id === activeTool);

        return (
          <div key={cat} className="flex flex-col">
            {/* Category header */}
            <button
              onClick={() => toggleCat(cat)}
              className={`flex items-center justify-between px-1.5 py-1.5 text-[8px] uppercase tracking-wider transition ${
                hasActiveTool
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  : 'text-[var(--color-text-secondary)]/60 hover:text-[var(--color-text-secondary)] hover:bg-white/5'
              }`}
            >
              <span className="truncate">{CATEGORY_LABELS[cat]}</span>
              <ChevronDown
                size={10}
                className={`shrink-0 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
              />
            </button>

            {/* Tool icons */}
            {isExpanded && (
              <div className="flex flex-col items-center gap-0.5 pb-1">
                {tools.map((t: EditorToolPlugin) => {
                  const Icon = t.icon;
                  const isActive = activeTool === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTool(isActive ? null : t.id)}
                      className={`flex h-8 w-10 items-center justify-center rounded-md transition ${
                        isActive
                          ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                          : 'text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white'
                      }`}
                      title={`${t.name}${t.shortcut ? ` (${t.shortcut})` : ''}`}
                    >
                      <Icon size={15} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
