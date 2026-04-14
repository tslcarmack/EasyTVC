import { Layers } from 'lucide-react';
import { registerTool, type EditorToolPlugin } from '../registry';
import { createElement } from 'react';

interface PresetDef {
  name: string;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  temperature: number;
  vignette: number;
}

const PRESETS: PresetDef[] = [
  { name: '电影', brightness: -5, contrast: 20, saturation: -10, hue: 0, temperature: -10, vignette: 40 },
  { name: '日系', brightness: 15, contrast: -10, saturation: -20, hue: 5, temperature: 10, vignette: 0 },
  { name: '赛博', brightness: 0, contrast: 30, saturation: 40, hue: -20, temperature: -30, vignette: 50 },
  { name: '复古', brightness: 5, contrast: -5, saturation: -30, hue: 10, temperature: 20, vignette: 30 },
  { name: '黑白', brightness: 0, contrast: 20, saturation: -100, hue: 0, temperature: 0, vignette: 20 },
  { name: '梦幻', brightness: 10, contrast: -15, saturation: 10, hue: 0, temperature: 5, vignette: 0 },
  { name: '暖阳', brightness: 10, contrast: 10, saturation: 15, hue: 5, temperature: 30, vignette: 20 },
  { name: '冷蓝', brightness: -5, contrast: 15, saturation: -10, hue: -10, temperature: -40, vignette: 30 },
  { name: '黑色电影', brightness: -15, contrast: 40, saturation: -40, hue: 0, temperature: -10, vignette: 60 },
  { name: 'LOMO', brightness: 0, contrast: 25, saturation: 20, hue: 0, temperature: 10, vignette: 50 },
  { name: '拍立得', brightness: 5, contrast: -10, saturation: -15, hue: 5, temperature: 15, vignette: 20 },
  { name: 'HDR', brightness: 0, contrast: 40, saturation: 30, hue: 0, temperature: 0, vignette: 0 },
];

function applyPresetToPixels(imageData: ImageData, preset: PresetDef): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const { width, height } = imageData;

  const bFactor = preset.brightness * 2.55;
  const cFactor = (259 * (preset.contrast + 255)) / (255 * (259 - preset.contrast));
  const satFactor = 1 + preset.saturation / 100;
  const tempR = preset.temperature * 1.5;
  const tempB = -preset.temperature * 1.5;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] + bFactor + tempR;
    let g = data[i + 1] + bFactor;
    let b = data[i + 2] + bFactor + tempB;

    r = cFactor * (r - 128) + 128;
    g = cFactor * (g - 128) + 128;
    b = cFactor * (b - 128) + 128;

    const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = gray + (r - gray) * satFactor;
    g = gray + (g - gray) * satFactor;
    b = gray + (b - gray) * satFactor;

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  if (preset.vignette > 0) {
    const cx = width / 2;
    const cy = height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    const vr = 0.7 * maxDist;
    const vf = 0.3 * maxDist;
    const vs = preset.vignette / 100;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > vr) {
          const fade = Math.min(1, (dist - vr) / vf);
          const darken = 1 - fade * vs;
          const idx = (y * width + x) * 4;
          data[idx] *= darken;
          data[idx + 1] *= darken;
          data[idx + 2] *= darken;
        }
      }
    }
  }

  return new ImageData(data, width, height);
}

const tool: EditorToolPlugin = {
  id: 'preset-filters',
  name: '滤镜预设',
  icon: Layers,
  category: 'adjust',
  hint: '一键应用电影、日系、赛博等风格滤镜',

  defaultParams: { preset: '' },

  renderParams(params, onChange) {
    return createElement('div', { className: 'grid grid-cols-2 gap-1.5' },
      ...PRESETS.map((p) =>
        createElement('button', {
          key: p.name,
          onClick: () => onChange('preset', p.name),
          className: `rounded-lg border px-2 py-2 text-[10px] transition ${
            params.preset === p.name
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-white'
              : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white'
          }`,
        }, p.name),
      ),
    );
  },

  applyCanvas(imageData, params) {
    const preset = PRESETS.find((p) => p.name === params.preset);
    if (!preset) return imageData;
    return applyPresetToPixels(imageData, preset);
  },
};

registerTool(tool);
