import { Smile } from 'lucide-react';
import { registerTool, type EditorToolPlugin } from '../registry';
import { createElement } from 'react';

const EXPRESSIONS = [
  { label: '微笑', en: 'smile' },
  { label: '严肃', en: 'serious' },
  { label: '惊讶', en: 'surprised' },
  { label: '生气', en: 'angry' },
  { label: '伤心', en: 'sad' },
  { label: '眨眼', en: 'wink' },
  { label: '大笑', en: 'laugh' },
  { label: '思考', en: 'thinking' },
];

const tool: EditorToolPlugin = {
  id: 'ai-expression',
  name: '表情调整',
  icon: Smile,
  category: 'ai',
  hint: '修改人物面部表情，保持其他不变',
  needsMask: true,

  defaultParams: { expression: 'smile' },

  renderParams(params, onChange) {
    return createElement('div', { className: 'space-y-3' },
      createElement('p', { className: 'text-[10px] text-[var(--color-text-secondary)] leading-relaxed' },
        '选择目标表情，可用画笔涂抹面部区域以提高精准度。',
      ),
      createElement('div', { className: 'grid grid-cols-2 gap-1.5' },
        ...EXPRESSIONS.map((exp) =>
          createElement('button', {
            key: exp.en,
            onClick: () => onChange('expression', exp.en),
            className: `rounded-lg border px-2 py-2 text-[10px] transition ${
              params.expression === exp.en
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-white'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white'
            }`,
          }, exp.label),
        ),
      ),
    );
  },

  buildAIRequest(context) {
    const expression = context.params.expression || 'smile';
    return {
      prompt: `Change the facial expression of the person to ${expression}, keep everything else identical. ${context.params.prompt || ''}`.trim(),
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
