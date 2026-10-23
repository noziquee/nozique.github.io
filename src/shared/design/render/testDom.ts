/** A tiny stand-in for the browser's document, enough for the renderer and element tests. */
export class FakeNode {
  children: FakeNode[] = [];
  attributes: Record<string, string> = {};
  styles: Record<string, string> = {};
  textContent = '';
  style = { setProperty: (name: string, value: string) => void (this.styles[name] = value) };
  constructor(public tagName: string) {}
  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }
  appendChild(child: FakeNode) {
    this.children.push(child);
    return child;
  }
}

export const fakeDocument = {
  createElement: (tag: string) => new FakeNode(tag),
} as unknown as Document;

export const asNode = (value: unknown) => value as FakeNode;
