import { PaintBucket } from 'lucide-react';
import { registerTool, type EditorToolPlugin } from '../registry';
import { createElement } from 'react';

const tool: EditorToolPlugin = {
  id: 'ai-local-repaint',
  name: '局部重绘',
  icon: PaintBucket,
  category: 'ai',
  hint: '涂抹区域后描述想要生成的内容，AI 无缝替换',
  needsMask: true,

  defaultParams: { description: '' },

  renderParams(params, onChange) {
    return createElement('div', { className: 'space-y-2' },
      createElement('p', { className: 'text-[10px] text-[var(--color-text-secondary)] leading-relaxed' },
        '用画笔涂抹需要重绘的区域，然后描述想要替换为什么内容。',
      ),
      createElement('div', { className: 'space-y-1' },
        createElement('label', { className: 'text-[10px] text-[var(--color-text-secondary)]' }, '替换内容描述'),
        createElement('input', {
          type: 'text',
          value: params.description || '',
          onChange: (e: any) => onChange('description', e.target.value),
          placeholder: '例如：一只可爱的猫咪...',
          className: 'w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-[11px] text-white placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:outline-none',
        }),
      ),
    );
  },

  buildAIRequest(context) {
    const desc = context.params.description || context.params.prompt || 'natural content';
    return {
      prompt: `In the masked area, replace the content with: ${desc}. Blend seamlessly with surrounding image.`,
      referenceImageUrls: [
        context.currentImageDataUrl,
        ...(context.maskDataUrl ? [context.maskDataUrl] : []),
      ],
      width: context.canvasWidth,
      height: context.canvasHeight,
    };
  },
};

registerTool(tool);
