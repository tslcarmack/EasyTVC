import { Sparkle } from 'lucide-react';
import { registerTool, type EditorToolPlugin } from '../registry';
import { createElement } from 'react';

function sliderRow(label: string, key: string, min: number, max: number, params: Record<string, any>, onChange: (k: string, v: any) => void) {
  return createElement('div', { className: 'space-y-1' },
    createElement('div', { className: 'flex justify-between' },
      createElement('label', { className: 'text-[10px] text-[var(--color-text-secondary)]' }, label),
      createElement('span', { className: 'text-[10px] text-white' }, params[key] ?? 0),
    ),
    createElement('input', {
      type: 'range', min, max,
      value: params[key] ?? 0,
      onChange: (e: any) => onChange(key, parseInt(e.target.value)),
      className: 'w-full accent-[var(--color-primary)]',
    }),
  );
}

function gaussRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const tool: EditorToolPlugin = {
  id: 'noise-grain',
  name: '噪点/颗粒',
  icon: Sparkle,
  category: 'adjust',
  hint: '添加胶片噪点或数字噪声效果',

  defaultParams: { amount: 30, type: 'gaussian' },

  renderParams(params, onChange) {
    return createElement('div', { className: 'space-y-3' },
      createElement('div', { className: 'flex gap-2' },
        createElement('button', {
          onClick: () => onChange('type', 'gaussian'),
          className: `flex-1 rounded-lg border py-1.5 text-[10px] transition ${
            params.type === 'gaussian'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white'
              : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white'
          }`,
        }, '高斯'),
        createElement('button', {
          onClick: () => onChange('type', 'uniform'),
          className: `flex-1 rounded-lg border py-1.5 text-[10px] transition ${
            params.type === 'uniform'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white'
              : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white'
          }`,
        }, '均匀'),
      ),
      sliderRow('数量', 'amount', 0, 100, params, onChange),
    );
  },

  applyCanvas(imageData, params) {
    const { amount = 30, type = 'gaussian' } = params;
    if (amount === 0) return imageData;

    const data = new Uint8ClampedArray(imageData.data);
    const intensity = amount * 2.55;

    for (let i = 0; i < data.length; i += 4) {
      const noise = type === 'gaussian'
        ? gaussRandom() * intensity
        : (Math.random() - 0.5) * 2 * intensity;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }

    return new ImageData(data, imageData.width, imageData.height);
  },
};

registerTool(tool);
