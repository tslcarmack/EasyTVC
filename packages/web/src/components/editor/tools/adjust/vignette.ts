import { CircleDot } from 'lucide-react';
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

const tool: EditorToolPlugin = {
  id: 'vignette',
  name: '暗角',
  icon: CircleDot,
  category: 'adjust',
  hint: '添加暗角效果，聚焦视觉中心',

  defaultParams: { strength: 50, radius: 70, feather: 50 },

  renderParams(params, onChange) {
    return createElement('div', { className: 'space-y-3' },
      sliderRow('强度', 'strength', 0, 100, params, onChange),
      sliderRow('半径', 'radius', 10, 100, params, onChange),
      sliderRow('羽化', 'feather', 0, 100, params, onChange),
    );
  },

  applyCanvas(imageData, params) {
    const { strength = 50, radius = 70, feather = 50 } = params;
    if (strength === 0) return imageData;

    const data = new Uint8ClampedArray(imageData.data);
    const { width, height } = imageData;
    const cx = width / 2;
    const cy = height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    const r = (radius / 100) * maxDist;
    const f = Math.max(1, (feather / 100) * maxDist);
    const s = strength / 100;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > r) {
          const fade = Math.min(1, (dist - r) / f);
          const darken = 1 - fade * s;
          const idx = (y * width + x) * 4;
          data[idx] *= darken;
          data[idx + 1] *= darken;
          data[idx + 2] *= darken;
        }
      }
    }

    return new ImageData(data, width, height);
  },
};

registerTool(tool);
