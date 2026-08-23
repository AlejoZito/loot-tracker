export type Segment =
  | { type: 'text'; content: string }
  | { type: 'emote'; tag: string };

export function parseSegments(text: string): Segment[] {
  const result: Segment[] = [];
  for (const part of text.split(/(<\w+>)/)) {
    const match = part.match(/^<(\w+)>$/);
    if (match) result.push({ type: 'emote', tag: match[1] });
    else if (part) result.push({ type: 'text', content: part });
  }
  return result;
}
