import { loadDesign } from '../shared/design';
import { registerBuiltInElements, renderDesign } from '../shared/design/render';

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
  const root = renderDesign(result.design, {
    onWarning: (message) => showErrors([message]),
  });
  // Scale the design to fit the width of the stage.
  const scale = Math.min(1, stage.clientWidth / result.design.layouts.desktop.width);
  const holder = document.createElement('div');
  holder.style.width = `${result.design.layouts.desktop.width * scale}px`;
  holder.style.height = `${result.design.layouts.desktop.height * scale}px`;
  root.style.transformOrigin = 'top left';
  root.style.transform = `scale(${scale})`;
  holder.appendChild(root);
  stage.replaceChildren(holder);
}

input.value = JSON.stringify(SAMPLE, null, 2);
input.addEventListener('input', update);
window.addEventListener('resize', update);
update();
