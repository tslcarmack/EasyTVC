import { Crop } from 'lucide-react';
import { registerTool, type EditorToolPlugin } from '../registry';
import { createElement } from 'react';

const ASPECT_PRESETS = [
  { label: '自由', value: 'free' },
  { label: '1:1', value: '1:1' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
  { label: '4:3', value: '4:3' },
  { label: '3:2', value: '3:2' },
];

const cropTool: EditorToolPlugin = {
  id: 'crop',
  name: '裁剪',
  icon: Crop,
  category: 'transform',
  shortcut: 'C',
  hint: '拖拽选择裁剪区域，输入精确尺寸或选择比例',

  defaultParams: {
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    aspect: 'free',
  },

  renderParams(params, onChange) {
    return createElement('div', { className: 'space-y-3' },
      createElement('div', { className: 'space-y-1.5' },
        createElement('label', { className: 'text-[10px] text-[var(--color-text-secondary)]' }, '比例'),
        createElement('div', { className: 'flex flex-wrap gap-1' },
          ...ASPECT_PRESETS.map((p) =>
            createElement('button', {
              key: p.value,
              onClick: () => onChange('aspect', p.value),
              className: `rounded px-2 py-0.5 text-[10px] transition ${
                params.aspect === p.value
                  ? 'bg-[var(--color-primary)]/20 text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5'
              }`,
            }, p.label),
          ),
        ),
      ),
      createElement('div', { className: 'grid grid-cols-2 gap-2' },
        ...['x', 'y', 'w', 'h'].map((k) =>
          createElement('div', { key: k, className: 'space-y-0.5' },
            createElement('label', { className: 'text-[10px] text-[var(--color-text-secondary)]' },
              k === 'x' ? 'X' : k === 'y' ? 'Y' : k === 'w' ? '宽' : '高',
            ),
            createElement('input', {
              type: 'number',
              value: params[k] || 0,
              onChange: (e: any) => onChange(k, parseInt(e.target.value) || 0),
              className: 'w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[11px] text-white focus:border-[var(--color-primary)] focus:outline-none',
            }),
          ),
        ),
      ),
    );
  },

  applyCanvas(imageData, params) {
    const { x, y, w, h } = params;
    const cropX = Math.max(0, Math.min(x || 0, imageData.width - 1));
    const cropY = Math.max(0, Math.min(y || 0, imageData.height - 1));
    const cropW = Math.max(1, Math.min(w || imageData.width, imageData.width - cropX));
    const cropH = Math.max(1, Math.min(h || imageData.height, imageData.height - cropY));

    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    const cropped = ctx.getImageData(cropX, cropY, cropW, cropH);
    return cropped;
  },
};

registerTool(cropTool);
