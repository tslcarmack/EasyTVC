import { Focus } from 'lucide-react';
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

function applyConvolution(imageData: ImageData, kernel: number[][], _divisor?: number): ImageData {
  const { width, height, data: src } = imageData;
  const out = new Uint8ClampedArray(src);
  const ks = kernel.length;
  const half = Math.floor(ks / 2);

  let divisor = _divisor;
  if (divisor === undefined) {
    divisor = 0;
    for (const row of kernel) for (const v of row) divisor += v;
    if (divisor === 0) divisor = 1;
  }

  for (let y = half; y < height - half; y++) {
    for (let x = half; x < width - half; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = 0; ky < ks; ky++) {
          for (let kx = 0; kx < ks; kx++) {
            const idx = ((y + ky - half) * width + (x + kx - half)) * 4 + c;
            sum += src[idx] * kernel[ky][kx];
          }
        }
        out[(y * width + x) * 4 + c] = Math.max(0, Math.min(255, sum / divisor));
      }
    }
  }

  return new ImageData(out, width, height);
}

const tool: EditorToolPlugin = {
  id: 'sharpen-blur',
  name: '锐化/模糊',
  icon: Focus,
  category: 'adjust',
  hint: '锐化增强细节或模糊柔化图像',

  defaultParams: { type: 'sharpen', strength: 50 },

  renderParams(params, onChange) {
    return createElement('div', { className: 'space-y-3' },
      createElement('div', { className: 'flex gap-2' },
        createElement('button', {
          onClick: () => onChange('type', 'sharpen'),
          className: `flex-1 rounded-lg border py-1.5 text-[10px] transition ${
            params.type === 'sharpen'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white'
              : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5'
          }`,
        }, '锐化'),
        createElement('button', {
          onClick: () => onChange('type', 'blur'),
          className: `flex-1 rounded-lg border py-1.5 text-[10px] transition ${
            params.type === 'blur'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white'
              : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5'
          }`,
        }, '模糊'),
      ),
      sliderRow('强度', 'strength', 0, 100, params, onChange),
    );
  },

  applyCanvas(imageData, params) {
    const { type, strength = 50 } = params;
    if (strength === 0) return imageData;

    const s = strength / 100;

    if (type === 'sharpen') {
      const center = 1 + 4 * s;
      const edge = -s;
      const kernel = [
        [0, edge, 0],
        [edge, center, edge],
        [0, edge, 0],
      ];
      return applyConvolution(imageData, kernel, 1);
    } else {
      const kernel = [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1],
      ];
      let result = imageData;
      const passes = Math.max(1, Math.round(s * 3));
      for (let i = 0; i < passes; i++) {
        result = applyConvolution(result, kernel);
      }
      return result;
    }
  },
};

registerTool(tool);
