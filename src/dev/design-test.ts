import { loadDesign } from '../shared/design';
import type { Design } from '../shared/design';
import { mountDesign, registerBuiltInElements } from '../shared/design/render';
import type { MountedDesign } from '../shared/design/render';

const SAMPLE = {
  version: 1,
  layouts: {
    desktop: {
      width: 1200,
      height: 520,
      background: '#0b0b0c',
      elements: [
        {
          id: 'panel',
          type: 'shape',
          position: { x: 60, y: 60 },
          size: { width: 520, height: 400 },
          style: { fill: '#151517', stroke: '#2a2a2e', strokeWidth: 2, radius: 24 },
        },
        {
          id: 'dot',
          type: 'shape',
          shape: 'ellipse',
          position: { x: 860, y: 90 },
          size: { width: 260, height: 260 },
          rotation: 12,
          opacity: 0.9,
          style: { fill: '#e8281e' },
        },
        {
          id: 'title',
          type: 'text',
          position: { x: 90, y: 100 },
          size: { width: 460, height: 120 },
          content: { text: 'Hello, Nozique' },
          style: {
            fontFamily: 'Archivo',
            fontSize: 64,
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.05,
          },
        },
        {
          id: 'body',
          type: 'text',
          position: { x: 90, y: 250 },
          size: { width: 460, height: 160 },
          content: { text: 'This text is drawn by the shared renderer.\nSecond line, in italics.' },
          style: {
            fontFamily: 'Instrument Sans',
            fontSize: 22,
            italic: true,
            color: '#9a9a9a',
            lineHeight: 1.5,
          },
        },
      ],
    },
  },
};

const input = document.getElementById('json') as HTMLTextAreaElement;
const errors = document.getElementById('errors') as HTMLUListElement;
const status = document.getElementById('status') as HTMLParagraphElement;
const stage = document.getElementById('stage') as HTMLDivElement;
const phone = document.getElementById('phone') as HTMLDivElement;

let mounted: MountedDesign[] = [];

registerBuiltInElements();

function showErrors(messages: string[]) {
  errors.replaceChildren(
    ...messages.map((message) => {
      const item = document.createElement('li');
      item.textContent = message;
      return item;
    }),
  );
}

function update() {
  let raw: unknown;
  try {
    raw = JSON.parse(input.value);
  } catch (error) {
    status.textContent = '';
    showErrors([`Not valid JSON: ${error instanceof Error ? error.message : 'unknown error'}`]);
    return;
  }
  const result = loadDesign(raw);
  if (!result.ok) {
    status.textContent = '';
    showErrors(result.errors);
    return;
  }
  showErrors([]);
  status.textContent = 'Valid design.';
  draw(result.design);
}

function draw(design: Design) {
  const onWarning = (message: string) => showErrors([message]);
  if (mounted.length > 0) {
    mounted.forEach((item) => item.update(design));
    return;
  }
  mounted = [stage, phone].map((host) => mountDesign(host, design, { onWarning }));
}

input.value = JSON.stringify(SAMPLE, null, 2);
input.addEventListener('input', update);
update();
