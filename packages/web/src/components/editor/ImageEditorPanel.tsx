import { useEffect } from 'react';
import { useImageEditorStore } from '../../stores/imageEditorStore';
import { EditorHeader } from './EditorHeader';
import { EditorToolbar } from './EditorToolbar';
import { EditorCanvas } from './EditorCanvas';
import { EditorProperties } from './EditorProperties';
import { EditorStatusBar } from './EditorStatusBar';

import './tools';

export function ImageEditorPanel() {
  const isOpen = useImageEditorStore((s) => s.isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          useImageEditorStore.getState().redo();
        } else {
          useImageEditorStore.getState().undo();
        }
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[var(--color-bg)]">
      <EditorHeader />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <EditorToolbar />
        <EditorCanvas />
        <EditorProperties />
      </div>
      <EditorStatusBar />
    </div>
  );
}
