import { ScissorsLineDashed } from 'lucide-react';
import { registerTool, type EditorToolPlugin } from '../registry';
import { createElement } from 'react';

const tool: EditorToolPlugin = {
  id: 'ai-bg-remove',
  name: '背景移除',
  icon: ScissorsLineDashed,
  category: 'ai',
  hint: 'AI 自动识别主体并移除背景',

  defaultParams: {},

  renderParams(_params, _onChange) {
    return createElement('div', { className: 'space-y-2' },
      createElement('p', { className: 'text-[10px] text-[var(--color-text-secondary)] leading-relaxed' },
        'AI 将自动检测图片中的主体，移除背景并保留主体。无需手动选择区域。',
      ),
    );
  },

  buildAIRequest(context) {
    return {
      prompt: `Remove the background completely, keep only the main subject on a transparent/white background. ${context.params.prompt || ''}`.trim(),
      referenceImageUrls: [context.currentImageDataUrl],
      width: context.canvasWidth,
      height: context.canvasHeight,
    };
  },
};

registerTool(tool);
