import { Palette } from 'lucide-react';
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

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    hue2rgb(p, q, h + 1 / 3) * 255,
    hue2rgb(p, q, h) * 255,
    hue2rgb(p, q, h - 1 / 3) * 255,
  ];
}

const tool: EditorToolPlugin = {
  id: 'saturation-hue',
  name: '饱和度/色相',
  icon: Palette,
  category: 'adjust',
  hint: '调整颜色饱和度和色相偏移',

  defaultParams: { saturation: 0, hue: 0 },

  renderParams(params, onChange) {
    return createElement('div', { className: 'space-y-3' },
      sliderRow('饱和度', 'saturation', -100, 100, params, onChange),
      sliderRow('色相', 'hue', -180, 180, params, onChange),
    );
  },

  applyCanvas(imageData, params) {
    const { saturation = 0, hue = 0 } = params;
    const data = new Uint8ClampedArray(imageData.data);
    const satFactor = 1 + saturation / 100;
    const hueShift = hue / 360;

    for (let i = 0; i < data.length; i += 4) {
      let [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      h = (h + hueShift + 1) % 1;
      s = Math.max(0, Math.min(1, s * satFactor));
      const [r, g, b] = hslToRgb(h, s, l);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }

    return new ImageData(data, imageData.width, imageData.height);
  },
};

registerTool(tool);
