export interface Tip {
  text: string;
  users: 'all' | string[];
}

export type Segment =
  | { type: 'text'; content: string }
  | { type: 'emotion'; emotion: string };

/** Split a message string into text and emotion-tag segments.
 *  Example: "Hello <surprised> wow!" → [text, emotion, text] */
export function parseSegments(text: string): Segment[] {
  const result: Segment[] = [];
  for (const part of text.split(/(<\w+>)/)) {
    const match = part.match(/^<(\w+)>$/);
    if (match) result.push({ type: 'emotion', emotion: match[1] });
    else if (part) result.push({ type: 'text', content: part });
  }
  return result;
}
