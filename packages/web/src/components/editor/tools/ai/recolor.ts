import { Paintbrush } from 'lucide-react';
import { registerTool, type EditorToolPlugin } from '../registry';
import { createElement } from 'react';

const tool: EditorToolPlugin = {
  id: 'ai-recolor',
  name: '物体变色',
  icon: Paintbrush,
  category: 'ai',
  hint: '涂抹选择物体，AI 改变其颜色',
  needsMask: true,

  defaultParams: { targetColor: '#ff0000' },

  renderParams(params, onChange) {
    return createElement('div', { className: 'space-y-2' },
      createElement('p', { className: 'text-[10px] text-[var(--color-text-secondary)] leading-relaxed' },
        '用画笔涂抹要变色的物体，然后选择目标颜色。',
      ),
      createElement('div', { className: 'space-y-1' },
        createElement('label', { className: 'text-[10px] text-[var(--color-text-secondary)]' }, '目标颜色'),
        createElement('div', { className: 'flex items-center gap-2' },
          createElement('input', {
            type: 'color',
            value: params.targetColor || '#ff0000',
            onChange: (e: any) => onChange('targetColor', e.target.value),
            className: 'h-8 w-8 cursor-pointer rounded border border-[var(--color-border)] bg-transparent',
          }),
          createElement('span', { className: 'text-[11px] text-white' }, params.targetColor || '#ff0000'),
        ),
      ),
    );
  },

  buildAIRequest(context) {
    const color = context.params.targetColor || '#ff0000';
    return {
      prompt: `Change the color of the masked object to ${color}. Keep everything else identical. ${context.params.prompt || ''}`.trim(),
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
