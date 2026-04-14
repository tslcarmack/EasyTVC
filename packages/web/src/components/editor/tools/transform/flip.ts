import { FlipHorizontal2 } from 'lucide-react';
import { registerTool, type EditorToolPlugin } from '../registry';
import { createElement } from 'react';

const flipTool: EditorToolPlugin = {
  id: 'flip',
  name: '翻转',
  icon: FlipHorizontal2,
  category: 'transform',
  hint: '水平或垂直翻转图片',

  defaultParams: { direction: 'horizontal' },

  renderParams(params, onChange) {
    return createElement('div', { className: 'flex gap-2' },
      createElement('button', {
        onClick: () => onChange('direction', 'horizontal'),
        className: `flex-1 rounded-lg border py-2 text-[11px] transition ${
          params.direction === 'horizontal'
            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white'
            : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5'
        }`,
      }, '↔ 水平翻转'),
      createElement('button', {
        onClick: () => onChange('direction', 'vertical'),
        className: `flex-1 rounded-lg border py-2 text-[11px] transition ${
          params.direction === 'vertical'
            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white'
            : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5'
        }`,
      }, '↕ 垂直翻转'),
    );
  },

  applyCanvas(imageData, params) {
    const { direction } = params;
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = imageData.width;
    srcCanvas.height = imageData.height;
    const srcCtx = srcCanvas.getContext('2d')!;
    srcCtx.putImageData(imageData, 0, 0);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = imageData.width;
    outCanvas.height = imageData.height;
    const outCtx = outCanvas.getContext('2d')!;

    if (direction === 'horizontal') {
      outCtx.translate(imageData.width, 0);
      outCtx.scale(-1, 1);
    } else {
      outCtx.translate(0, imageData.height);
      outCtx.scale(1, -1);
    }
    outCtx.drawImage(srcCanvas, 0, 0);

    return outCtx.getImageData(0, 0, imageData.width, imageData.height);
  },
};

registerTool(flipTool);
