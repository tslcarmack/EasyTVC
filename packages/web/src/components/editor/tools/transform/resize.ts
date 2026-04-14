import { Scaling } from 'lucide-react';
import { registerTool, type EditorToolPlugin } from '../registry';
import { createElement } from 'react';

const resizeTool: EditorToolPlugin = {
  id: 'resize',
  name: '缩放',
  icon: Scaling,
  category: 'transform',
  hint: '调整图片尺寸，可锁定比例',

  defaultParams: { width: 0, height: 0, lockAspect: true },

  renderParams(params, onChange) {
    return createElement('div', { className: 'space-y-3' },
      createElement('div', { className: 'space-y-1' },
        createElement('label', { className: 'text-[10px] text-[var(--color-text-secondary)]' }, '宽度 (px)'),
        createElement('input', {
          type: 'number',
          value: params.width || 0,
          onChange: (e: any) => {
            const w = parseInt(e.target.value) || 0;
            onChange('width', w);
            if (params.lockAspect && params._origW && params._origH) {
              onChange('height', Math.round(w * params._origH / params._origW));
            }
          },
          className: 'w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[11px] text-white focus:border-[var(--color-primary)] focus:outline-none',
        }),
      ),
      createElement('div', { className: 'space-y-1' },
        createElement('label', { className: 'text-[10px] text-[var(--color-text-secondary)]' }, '高度 (px)'),
        createElement('input', {
          type: 'number',
          value: params.height || 0,
          onChange: (e: any) => {
            const h = parseInt(e.target.value) || 0;
            onChange('height', h);
            if (params.lockAspect && params._origW && params._origH) {
              onChange('width', Math.round(h * params._origW / params._origH));
            }
          },
          className: 'w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[11px] text-white focus:border-[var(--color-primary)] focus:outline-none',
        }),
      ),
      createElement('label', { className: 'flex items-center gap-2 cursor-pointer' },
        createElement('input', {
          type: 'checkbox',
          checked: params.lockAspect ?? true,
          onChange: (e: any) => onChange('lockAspect', e.target.checked),
          className: 'accent-[var(--color-primary)]',
        }),
        createElement('span', { className: 'text-[10px] text-[var(--color-text-secondary)]' }, '锁定比例'),
      ),
    );
  },

  applyCanvas(imageData, params) {
    const w = params.width || imageData.width;
    const h = params.height || imageData.height;
    if (w === imageData.width && h === imageData.height) return imageData;

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = imageData.width;
    srcCanvas.height = imageData.height;
    srcCanvas.getContext('2d')!.putImageData(imageData, 0, 0);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = w;
    outCanvas.height = h;
    outCanvas.getContext('2d')!.drawImage(srcCanvas, 0, 0, w, h);

    return outCanvas.getContext('2d')!.getImageData(0, 0, w, h);
  },
};

registerTool(resizeTool);
