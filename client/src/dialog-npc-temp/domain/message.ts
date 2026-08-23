export interface DialogMessageObject {
  text: string;
  durationMs?: number;
}

export type DialogMessage = string | DialogMessageObject;

export interface InternalMessage {
  id: number;
  text: string;
  durationMs: number;
}

let _nextId = 0;

export function normalizeMessage(msg: DialogMessage, defaultDurationMs: number): InternalMessage {
  const text = typeof msg === 'string' ? msg : msg.text;
  const durationMs = typeof msg === 'object' && msg.durationMs != null ? msg.durationMs : defaultDurationMs;
  return { id: _nextId++, text, durationMs };
}
