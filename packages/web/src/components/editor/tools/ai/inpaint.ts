import { Eraser } from 'lucide-react';
import { registerTool, type EditorToolPlugin } from '../registry';
import { createElement } from 'react';

const tool: EditorToolPlugin = {
  id: 'ai-inpaint',
  name: '智能擦除',
  icon: Eraser,
  category: 'ai',
  hint: '用画笔涂抹要擦除的区域，AI 自动填充背景',
  needsMask: true,

  defaultParams: {},

  renderParams(_params, _onChange) {
    return createElement('div', { className: 'space-y-2' },
      createElement('p', { className: 'text-[10px] text-[var(--color-text-secondary)] leading-relaxed' },
        '用画笔涂抹需要擦除的物体或区域，AI 将自动用自然背景填充。',
      ),
      createElement('div', { className: 'rounded-md bg-[var(--color-primary)]/5 px-2 py-1.5 text-[10px] text-[var(--color-primary)]' },
        '提示：涂抹完成后点击"AI 生成"按钮',
      ),
    );
  },

  buildAIRequest(context) {
    return {
      prompt: `Remove the object in the masked area and fill with natural background. ${context.params.prompt || ''}`.trim(),
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
