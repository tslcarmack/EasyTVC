import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { Send, Mic, ChevronDown, Loader2 } from 'lucide-react';
import type { AIModelInfo } from '@easytvc/shared';

interface NodePromptBarProps {
  placeholder: string;
  models: AIModelInfo[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  onSubmit: (prompt: string) => void;
  isGenerating: boolean;
  configSlot?: ReactNode;
  leftSlot?: ReactNode;
  credits?: number;
  creditsUnit?: string;
  initialPrompt?: string;
}

export function NodePromptBar({
  placeholder,
  models,
  selectedModel,
  onModelChange,
  onSubmit,
  isGenerating,
  configSlot,
  leftSlot,
  credits,
  creditsUnit,
  initialPrompt,
}: NodePromptBarProps) {
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  useEffect(() => {
    if (initialPrompt !== undefined) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  const currentModel = models.find((m) => m.id === selectedModel) || models[0];

  const handleSubmit = useCallback(() => {
    if (!prompt.trim() || isGenerating) return;
    onSubmit(prompt);
  }, [prompt, isGenerating, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className="nodrag nowheel bg-[var(--color-surface)] p-3">
      {/* Top row: left slot (references) + prompt */}
      {leftSlot && (
        <div className="mb-2 flex items-center gap-1">
          {leftSlot}
        </div>
      )}

      {/* Prompt input */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={2}
        disabled={isGenerating}
        className="w-full resize-none rounded-lg bg-transparent text-sm text-white placeholder:text-[var(--color-text-secondary)] outline-none disabled:opacity-50"
      />

      {/* Bottom row: model + config + actions */}
      <div className="mt-2 flex items-center gap-2 text-xs">
        {/* Model selector */}
        <div className="relative">
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-surface-hover)] transition"
          >
            <span className="max-w-[120px] truncate">{currentModel?.name || 'Select model'}</span>
            <ChevronDown size={12} />
          </button>

          {showModelDropdown && (
            <div className="absolute bottom-full left-0 mb-1 z-50 min-w-[180px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-xl">
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onModelChange(m.id);
                    setShowModelDropdown(false);
                  }}
                  className={`flex w-full items-center px-3 py-1.5 text-left text-xs transition ${
                    m.id === selectedModel
                      ? 'text-white bg-[var(--color-primary)]/20'
                      : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  <span className="truncate">{m.name}</span>
                  <span className="ml-auto text-[10px] opacity-50">{m.provider}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Type-specific config slot */}
        {configSlot}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Microphone */}
        <button
          className="rounded-md p-1 text-[var(--color-text-secondary)] hover:text-white transition"
          title="Voice input"
        >
          <Mic size={14} />
        </button>

        {/* Batch count */}
        <span className="text-[var(--color-text-secondary)]">1x</span>

        {/* Credits */}
        {credits !== undefined && (
          <span className="flex items-center gap-0.5 text-[var(--color-text-secondary)]">
            <span className="text-[10px]">⬡</span>
            {credits}{creditsUnit ? `/${creditsUnit}` : ''}
          </span>
        )}

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={!prompt.trim() || isGenerating}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/80 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
        </button>
      </div>
    </div>
  );
}
